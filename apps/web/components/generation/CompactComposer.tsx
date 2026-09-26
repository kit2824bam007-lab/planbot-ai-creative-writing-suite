'use client';

import React, { useRef, useEffect } from 'react';
import { ArrowUp, Square, Sliders, X, Paperclip } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useChatStream } from '../../hooks/useChatStream';
import { cn } from '../../lib/utils';

export interface CompactComposerProps {
  onFocus?: () => void;
  onClick?: () => void;
  placeholder?: string;
}

export const CompactComposer: React.FC<CompactComposerProps> = ({
  onFocus,
  onClick,
  placeholder
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    promptText,
    setPromptText,
    language,
    setLanguage,
    isStreaming,
    uploadedMedia,
    setUploadedMedia,
    setIsOptionsDrawerOpen
  } = useChatStore();

  const { generate, stopStreaming } = useChatStream();

  // Auto-grow textarea smoothly from 1 line (36px) up to ~110px
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, 38), 110)}px`;
    }
  }, [promptText]);

  // Tamil Unicode Script Auto-Detection
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    if (text.length <= 1000) {
      setPromptText(text);

      const hasTamilUnicode = /[\u0B80-\u0BFF]/.test(text);
      if (hasTamilUnicode && language !== 'ta') {
        setLanguage('ta');
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if ((promptText.trim() || uploadedMedia) && !isStreaming) {
        generate();
      }
    }
  };

  const defaultPlaceholder =
    language === 'ta'
      ? 'என்னிடம் கேளுங்கள்…'
      : 'Ask me anything…';

  return (
    <div
      onClick={onClick}
      className="w-full bg-white/95 dark:bg-[#1A1624]/95 backdrop-blur-xl border border-stone-200/80 dark:border-purple-900/40 rounded-3xl shadow-[0_10px_35px_-5px_rgba(100,70,140,0.12)] p-2 sm:p-2.5 transition-all focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20"
    >
      {/* Attached Media Pill Indicator if uploaded */}
      {uploadedMedia && (
        <div className="mb-2 px-3 py-1.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-900/40 flex items-center justify-between text-xs text-primary dark:text-purple-300 animate-fade-in">
          <div className="flex items-center gap-2 truncate">
            <span className="text-sm">{uploadedMedia.type === 'image' ? '📷' : '🎥'}</span>
            <span className="font-semibold truncate max-w-[200px] sm:max-w-xs">{uploadedMedia.fileName}</span>
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
              {uploadedMedia.type}
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setUploadedMedia(null);
            }}
            className="p-1 rounded-full text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Remove media"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Row: [Options Icon] + [Textarea] + [Clear] + [Mic] + [Send Button] */}
      <div className="flex items-end gap-1.5 sm:gap-2">
        {/* Creative Settings & Tools Toggle Button (Sliders icon matching reference) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOptionsDrawerOpen(true);
          }}
          className="p-2 sm:p-2.5 rounded-2xl text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800/80 transition-colors shrink-0 mb-0.5"
          title="Creative Options & Media"
        >
          <Sliders className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
        </button>

        {/* Input Textarea (No autofocus on load to prevent keyboard popping up!) */}
        <textarea
          ref={textareaRef}
          value={promptText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={onFocus}
          placeholder={placeholder || defaultPlaceholder}
          rows={1}
          className="flex-1 resize-none bg-transparent border-0 outline-none px-1.5 py-2 text-sm sm:text-base text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 font-sans max-h-28 overflow-y-auto leading-relaxed"
        />

        {/* Clear prompt button */}
        {promptText && !isStreaming && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPromptText('');
            }}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors mb-2"
            title="Clear"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Circular Send / Stop Action Button (Matching reference circular dark button) */}
        <div className="shrink-0 mb-0.5">
          {isStreaming ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                stopStreaming();
              }}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:opacity-90 active:scale-95 transition-all shadow-soft-sm flex items-center justify-center"
              title="Stop generation"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              disabled={(!promptText.trim() && !uploadedMedia) || isStreaming}
              onClick={(e) => {
                e.stopPropagation();
                if ((promptText.trim() || uploadedMedia) && !isStreaming) {
                  generate();
                }
              }}
              className={cn(
                'w-9 h-9 sm:w-10 sm:h-10 rounded-full transition-all shadow-soft-sm flex items-center justify-center active:scale-95',
                promptText.trim() || uploadedMedia
                  ? 'bg-zinc-900 hover:bg-black text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 shadow-md'
                  : 'bg-stone-200/70 dark:bg-zinc-800 text-stone-400 dark:text-zinc-600 cursor-not-allowed'
              )}
              title="Send"
            >
              <ArrowUp className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
