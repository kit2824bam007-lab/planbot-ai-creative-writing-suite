'use client';

import React, { useRef, useEffect } from 'react';
import { ArrowUp, Square, X } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useChatStream } from '../../hooks/useChatStream';
import { cn } from '../../lib/utils';

export interface CompactComposerProps {
  onFocus?: () => void;
  onClick?: () => void;
}

export const CompactComposer: React.FC<CompactComposerProps> = ({ onFocus, onClick }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    mode,
    poemType,
    genre,
    promptText,
    setPromptText,
    language,
    setLanguage,
    quota,
    user,
    isStreaming,
    uploadedMedia,
    setUploadedMedia
  } = useChatStore();

  const { generate, stopStreaming } = useChatStream();

  // Auto-grow textarea smoothly from 1 line (~40px) up to ~130px
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, 40), 130)}px`;
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

  const placeholderText =
    language === 'ta'
      ? (mode === 'poem' ? 'அடுத்த கவிதை வரிகளை உள்ளிடவும்…' : mode === 'story' ? 'அடுத்த திருப்பத்தை உள்ளிடவும்…' : 'அடுத்த பதிவை உள்ளிடவும்…')
      : (mode === 'poem' ? 'Next poem prompt or verse…' : mode === 'story' ? 'Continue the story or add a twist…' : 'Type your next idea or hook…');

  const modeBadgeText =
    mode === 'poem'
      ? `📜 Poem · ${poemType || 'Haiku'}`
      : mode === 'story'
      ? `📖 Story · ${genre || 'General'}`
      : `📱 Content Creator`;

  return (
    <div
      onClick={onClick}
      className="w-full bg-white/92 dark:bg-[#181622]/90 backdrop-blur-md border border-[#E6DFD4] dark:border-[#282534] rounded-2xl shadow-soft-lg p-2 sm:p-2.5 transition-all focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15 cursor-text"
    >
      {/* Attached Media Indicator in Compact Mode */}
      {uploadedMedia && (
        <div className="mb-2 px-3 py-1.5 rounded-xl bg-primary/8 dark:bg-primary/15 border border-primary/20 flex items-center justify-between text-xs text-primary dark:text-primary-300 animate-fade-in shadow-2xs">
          <div className="flex items-center gap-2 truncate">
            <span className="text-sm">{uploadedMedia.type === 'image' ? '📷' : '🎥'}</span>
            <span className="font-semibold truncate max-w-[220px] sm:max-w-xs">{uploadedMedia.fileName}</span>
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary dark:text-primary-200">
              {uploadedMedia.type}
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setUploadedMedia(null);
            }}
            className="p-1 rounded-md text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            title="Remove media"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={promptText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={onFocus}
          onClick={(e) => {
            onClick?.();
          }}
          placeholder={placeholderText}
          rows={1}
          className="flex-1 resize-none bg-transparent border-0 outline-none px-2.5 py-1 text-sm text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 font-sans max-h-32 overflow-y-auto leading-relaxed cursor-text"
        />

        {promptText && !isStreaming && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPromptText('');
            }}
            className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors mb-1"
            title="Clear text"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Send / Stop Action Button */}
        <div className="shrink-0 mb-0.5">
          {isStreaming ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                stopStreaming();
              }}
              className="p-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:opacity-90 active:scale-95 transition-all shadow-2xs"
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
                'p-2 rounded-xl transition-all shadow-2xs flex items-center justify-center',
                promptText.trim() || uploadedMedia
                  ? 'bg-[#6B5488] hover:bg-[#5E477A] text-white active:scale-95 shadow-soft-sm'
                  : 'bg-warm-100 dark:bg-zinc-800 text-zinc-300 dark:text-zinc-600 cursor-not-allowed'
              )}
              title="Send message (Enter)"
            >
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>

      {/* Subtle bottom status bar */}
      <div className="flex items-center justify-between px-2 pt-1.5 mt-0.5 border-t border-zinc-100/70 dark:border-zinc-800/60 text-[11px] text-zinc-400 dark:text-zinc-500 gap-1.5 overflow-hidden">
        <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
          <span className="font-medium text-zinc-600 dark:text-zinc-300 truncate">
            {modeBadgeText}
          </span>
          <span className="opacity-50 shrink-0">•</span>
          <span className="text-zinc-500 dark:text-zinc-400 shrink-0">
            {language === 'ta' ? 'தமிழ்' : 'English'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-[10px] sm:text-[11px]">
          {quota?.isPro || (user?.plan === 'PRO' && user?.subscriptionStatus === 'ACTIVE') ? (
            <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full text-[10px] border border-amber-500/25">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              PRO
            </span>
          ) : quota && typeof quota.remaining === 'number' ? (
            <span className="text-zinc-500 dark:text-zinc-400">
              {quota.remaining}/{quota.limit ?? 10} today
            </span>
          ) : null}
          <span className="hidden md:inline text-zinc-400/80">
            Enter ↵ to send
          </span>
        </div>
      </div>
    </div>
  );
};
