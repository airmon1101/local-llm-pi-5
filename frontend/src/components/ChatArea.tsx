import React, { useRef, useEffect, useState } from 'react';
import { Message, HealthInfo } from '@/types';
import { ChatMessage } from './ChatMessage';
import { Bot, Sparkles, ArrowDown, Cpu, ShieldCheck } from 'lucide-react';

interface ChatAreaProps {
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
  onSendMessage: (text: string) => void;
  onRegenerate: () => void;
  onEditMessage: (newContent: string) => void;
  health: HealthInfo | null;
  autoScrollEnabled?: boolean;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  isStreaming,
  streamingContent,
  onSendMessage,
  onRegenerate,
  onEditMessage,
  health,
  autoScrollEnabled = true,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Auto-scroll to bottom when messages change or tokens stream in
  useEffect(() => {
    if (autoScrollEnabled && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingContent, autoScrollEnabled]);

  // Monitor manual user scroll to toggle "Scroll to Bottom" button
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
    setShowScrollBottom(!isNearBottom);
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const starterPrompts = [
    {
      title: 'Raspberry Pi Optimization',
      prompt: 'Explain how CPU inference works on Raspberry Pi 5 ARM Cortex-A76 cores and how to optimize RAM usage.',
    },
    {
      title: 'FastAPI & SQLite',
      prompt: 'Write an asynchronous Python FastAPI service using SQLite in WAL mode with aiosqlite.',
    },
    {
      title: 'Nginx SSE Configuration',
      prompt: 'How do I configure Nginx to proxy Server-Sent Events without response buffering?',
    },
    {
      title: 'Linux MicroSD Endurance',
      prompt: 'What strategies minimize write amplification and extend flash memory lifetime on a 64GB microSD card?',
    },
  ];

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto relative scrollbar-thin scrollbar-thumb-slate-800 flex flex-col"
    >
      {/* Empty State / Welcome View */}
      {messages.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto space-y-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-xl shadow-emerald-950/50">
              <Bot className="w-8 h-8" />
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-slate-900"></span>
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              PiLLM
            </h1>
            <p className="text-sm md:text-base text-slate-300 font-medium">
              Your AI. Your Raspberry Pi. Your Data.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs text-slate-400">
              <span className="flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                Model: {health?.model_name || 'qwen3:4b'}
              </span>
              <span className="flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Private Home LAN Only
              </span>
              <span className="bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700 font-mono">
                RPi 5 (8GB)
              </span>
            </div>
          </div>

          {/* Starter Prompts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full pt-4 text-left">
            {starterPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => onSendMessage(p.prompt)}
                className="p-3.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/60 transition group text-left shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-slate-200 group-hover:text-emerald-400 transition">
                    {p.title}
                  </span>
                  <Sparkles className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 transition" />
                </div>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {p.prompt}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message History */}
      {messages.map((msg, index) => {
        const isLastAssistant =
          msg.role === 'assistant' && index === messages.length - 1;
        return (
          <ChatMessage
            key={msg.id || index}
            message={msg}
            onRegenerate={isLastAssistant ? onRegenerate : undefined}
            onEdit={msg.role === 'user' ? onEditMessage : undefined}
          />
        );
      })}

      {/* Streaming message indicator */}
      {isStreaming && (
        <ChatMessage
          message={{
            id: 'streaming-assistant',
            conversation_id: 'active',
            role: 'assistant',
            content: streamingContent || 'Thinking...',
            created_at: new Date().toISOString(),
          }}
          isStreaming={true}
        />
      )}

      <div ref={bottomRef} className="h-4" />

      {/* Scroll to bottom button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          aria-label="Scroll to bottom"
          className="fixed bottom-24 right-8 p-2.5 rounded-full bg-slate-800 text-slate-200 hover:text-white border border-slate-700 shadow-xl hover:bg-slate-700 transition z-20"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
