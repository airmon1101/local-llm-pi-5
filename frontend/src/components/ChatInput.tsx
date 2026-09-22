import React, { useRef, useEffect, useState } from 'react';
import { ArrowUp, Square, Sparkles } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  onStop,
  isStreaming,
  disabled = false,
  placeholder = 'Message PiLLM (Qwen3 4B)...',
}) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea height up to 200px
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (isStreaming) {
      if (onStop) onStop();
      return;
    }

    if (input.trim() && !disabled) {
      onSend(input);
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-4 pt-2">
      <div className="relative rounded-2xl bg-slate-800/90 border border-slate-700/80 shadow-lg focus-within:border-emerald-500/80 focus-within:ring-2 focus-within:ring-emerald-500/20 transition duration-200">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={disabled ? 'PiLLM is offline or model is missing...' : placeholder}
          rows={1}
          aria-label="Chat input message"
          className="w-full py-3.5 pl-4 pr-14 bg-transparent text-slate-100 placeholder-slate-400 text-sm focus:outline-none resize-none overflow-y-auto max-h-48 leading-relaxed font-sans"
        />

        <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1">
          {isStreaming ? (
            <button
              onClick={onStop}
              aria-label="Stop generation"
              className="p-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition shadow-sm hover:scale-105 active:scale-95"
            >
              <Square className="w-4 h-4 fill-white" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={disabled || !input.trim()}
              aria-label="Send message"
              className={`p-2 rounded-xl text-white transition shadow-sm ${
                input.trim() && !disabled
                  ? 'bg-emerald-600 hover:bg-emerald-500 hover:scale-105 active:scale-95'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-50'
              }`}
            >
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between text-[11px] text-slate-500 px-2 pt-2">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-emerald-500" />
          PiLLM • Qwen3 4B on RPi 5 CPU
        </span>
        <span>
          <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-400">Shift</kbd> + <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-400">Enter</kbd> for newline
        </span>
      </div>
    </div>
  );
};
