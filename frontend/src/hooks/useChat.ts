import { useState, useEffect, useRef, useCallback } from 'react';
import { Message } from '@/types';
import { getChat, stopChatGeneration } from '@/lib/api';

interface UseChatProps {
  chatId: string | null;
  onNewMessage?: () => void;
  onTitleUpdated?: () => void;
}

export function useChat({ chatId, onNewMessage, onTitleUpdated }: UseChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Load message history when chatId changes
  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    const fetchHistory = async () => {
      try {
        setLoadingHistory(true);
        setError(null);
        const data = await getChat(chatId);
        if (isMounted) {
          setMessages(data.messages || []);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to load conversation history');
        }
      } finally {
        if (isMounted) setLoadingHistory(false);
      }
    };

    fetchHistory();
    return () => {
      isMounted = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [chatId]);

  const stopGeneration = useCallback(async () => {
    if (!chatId) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    try {
      await stopChatGeneration(chatId);
    } catch (err) {
      console.warn('Failed to notify backend of stop:', err);
    }

    // Commit whatever content was streamed so far
    if (streamingContent.trim()) {
      setMessages((prev) => [
        ...prev,
        {
          id: `partial-${Date.now()}`,
          conversation_id: chatId,
          role: 'assistant',
          content: streamingContent + ' [Generation stopped]',
          created_at: new Date().toISOString(),
        },
      ]);
    }

    setStreamingContent('');
    setIsStreaming(false);
  }, [chatId, streamingContent]);

  const sendMessage = useCallback(
    async (
      content: string,
      options?: {
        model?: string;
        temperature?: number;
        systemPrompt?: string;
      }
    ) => {
      if (!chatId || !content.trim() || isStreaming) return;

      setError(null);
      const userMessageText = content.trim();

      // Optimistic user message addition
      const optimisticUserMsg: Message = {
        id: `temp-${Date.now()}`,
        conversation_id: chatId,
        role: 'user',
        content: userMessageText,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticUserMsg]);
      setIsStreaming(true);
      setStreamingContent('');

      if (onNewMessage) onNewMessage();

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversation_id: chatId,
            message: userMessageText,
            model: options?.model,
            temperature: options?.temperature,
            system_prompt: options?.systemPrompt,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.detail || `Server error: ${response.statusText}`);
        }

        if (!response.body) {
          throw new Error('ReadableStream not supported by browser or backend');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let accumulatedText = '';
        let assistantMessageId = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const rawText = decoder.decode(value, { stream: true });
          const lines = rawText.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.error) {
                  throw new Error(data.error);
                }
                if (data.chunk) {
                  accumulatedText += data.chunk;
                  setStreamingContent(accumulatedText);
                }
                if (data.done) {
                  assistantMessageId = data.message_id || `msg-${Date.now()}`;
                }
              } catch (e: any) {
                if (e.message && !e.message.includes('JSON')) {
                  throw e;
                }
              }
            }
          }
        }

        // Commit full assistant message to history
        if (accumulatedText.trim()) {
          setMessages((prev) => [
            ...prev,
            {
              id: assistantMessageId || `asst-${Date.now()}`,
              conversation_id: chatId,
              role: 'assistant',
              content: accumulatedText,
              created_at: new Date().toISOString(),
            },
          ]);
        }

        if (onTitleUpdated) onTitleUpdated();
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log('Chat stream aborted by client');
        } else {
          console.error('Streaming error:', err);
          setError(err.message || 'Error generating response');
        }
      } finally {
        setIsStreaming(false);
        setStreamingContent('');
        abortControllerRef.current = null;
      }
    },
    [chatId, isStreaming, onNewMessage, onTitleUpdated]
  );

  const regenerate = useCallback(async () => {
    if (messages.length === 0 || isStreaming) return;
    // Find the last user message
    const lastUserMsgIndex = [...messages].reverse().findIndex((m) => m.role === 'user');
    if (lastUserMsgIndex === -1) return;

    const actualIndex = messages.length - 1 - lastUserMsgIndex;
    const lastUserPrompt = messages[actualIndex].content;

    // Prune messages up to that user message
    setMessages(messages.slice(0, actualIndex));
    // Re-send the prompt
    await sendMessage(lastUserPrompt);
  }, [messages, isStreaming, sendMessage]);

  return {
    messages,
    loadingHistory,
    isStreaming,
    streamingContent,
    error,
    sendMessage,
    stopGeneration,
    regenerate,
  };
}
