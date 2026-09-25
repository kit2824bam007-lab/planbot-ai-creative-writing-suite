'use client';

import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, X, Loader2, Globe } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useChatStream } from '../../hooks/useChatStream';
import { PoemOptions } from './PoemOptions';
import { StoryOptions } from './StoryOptions';
import { CreatorOptions } from './CreatorOptions';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import '../../i18n/i18n'; // Ensure i18n initialized

export interface GenerationPanelProps {
  onGenerate?: () => void;
  autoFocus?: boolean;
}

export const GenerationPanel: React.FC<GenerationPanelProps> = ({ onGenerate, autoFocus = false }) => {
  const { t, i18n } = useTranslation('generationPanel');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    mode,
    setMode,
    promptText,
    setPromptText,
    language,
    setLanguage,
    quota,
    user,
    isStreaming,
    uploadedMedia
  } = useChatStore();

  const { generate } = useChatStream();

  // Auto-grow textarea up to 5 rows
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 130)}px`;
    }
  }, [promptText]);

  // Tamil Unicode Script Auto-Detection
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    if (text.length <= 500) {
      setPromptText(text);

      const hasTamilUnicode = /[\u0B80-\u0BFF]/.test(text);
      if (hasTamilUnicode && language !== 'ta') {
        setLanguage('ta');
        toast.info(t('toasts.tamilDetected'), {
          duration: 2500,
          id: 'tamil-detect-toast'
        });
      }
    }
  };

  // Auto-focus textarea when expanded
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [autoFocus]);

  const handleGenerate = () => {
    if ((promptText.trim() || uploadedMedia) && !isStreaming) {
      generate();
      onGenerate?.();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  // Toggle Panel Language (EN <-> TA)
  const togglePanelLanguage = () => {
    const newLang = i18n.language === 'ta' ? 'en' : 'ta';
    i18n.changeLanguage(newLang);
  };

  // Quota & Pro status styling
  const isPro = Boolean(quota?.isPro || (user?.plan === 'PRO' && user?.subscriptionStatus === 'ACTIVE'));
  const remaining = quota?.remaining ?? 10;
  const limit = quota?.limit ?? 10;
  const isZeroQuota = remaining === 0;
  const isLowQuota = remaining <= 3 && remaining > 0;

  const placeholderText =
    mode === 'poem'
      ? 'Describe your poem theme… / உங்கள் கவிதைத் தீமை விவரிக்கவும்…'
      : mode === 'story'
      ? 'Enter your story premise… / உங்கள் கதைக் களத்தை விவரிக்கவும்…'
      : 'Enter your hook, thoughts, or theme for social card… / உங்கள் சமூகப் பதிவுச் சிந்தனையை உள்ளிடவும்…';

  // Summary chip in English only (chips stay clean)
  const getSummaryChip = () => {
    if (mode === 'creator') {
      const p = (useChatStore.getState().platform || 'instagram-post').replace('-', ' ');
      const s = (useChatStore.getState().style || 'aesthetic').replace('-', ' ');
      return `📱 ${p.replace(/\b\w/g, (l) => l.toUpperCase())} + ${s.replace(/\b\w/g, (l) => l.toUpperCase())}`;
    }
    if (mode === 'story') {
      const g = (useChatStore.getState().genre || 'generic').replace('-', ' ');
      return `📖 Story · ${g.replace(/\b\w/g, (l) => l.toUpperCase())}`;
    }
    const pt = useChatStore.getState().poemType || 'haiku';
    return `📜 Poem · ${pt}`;
  };

  return (
    <div className="w-full bg-white/92 dark:bg-[#181620]/90 backdrop-blur-md border border-[#E8E2D9] dark:border-[#282534] rounded-3xl shadow-soft-md p-3.5 sm:p-5 mb-4 transition-all">
      {/* Top Header: Mode Tabs + Summary Chip + Quota Pill */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 border-b border-[#EFEAE2] dark:border-[#262330] pb-3 sm:pb-3.5">
        {/* Mode Tabs (Bilingual: English primary, Tamil secondary small text) */}
        <div className="flex items-center gap-1.5 bg-[#FAF7F2] dark:bg-zinc-900/90 p-1 rounded-2xl border border-stone-200/60 dark:border-zinc-800/80 overflow-x-auto no-scrollbar max-w-full">
          <button
            type="button"
            onClick={() => setMode('poem')}
            className={cn(
              'px-3 sm:px-3.5 py-1.5 min-h-[38px] text-xs font-semibold rounded-xl transition-all flex items-center gap-1 sm:gap-1.5 shrink-0',
              mode === 'poem'
                ? 'bg-white dark:bg-zinc-800 text-primary shadow-soft-sm font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            )}
          >
            <span>📝 Poem</span>
            <span className="text-[10px] opacity-70 font-normal hidden sm:inline">/ கவிதை</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('story')}
            className={cn(
              'px-3 sm:px-3.5 py-1.5 min-h-[38px] text-xs font-semibold rounded-xl transition-all flex items-center gap-1 sm:gap-1.5 shrink-0',
              mode === 'story'
                ? 'bg-white dark:bg-zinc-800 text-primary shadow-soft-sm font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            )}
          >
            <span>📖 Story</span>
            <span className="text-[10px] opacity-70 font-normal hidden sm:inline">/ கதை</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('creator')}
            className={cn(
              'px-3 sm:px-3.5 py-1.5 min-h-[38px] text-xs font-semibold rounded-xl transition-all flex items-center gap-1 sm:gap-1.5 shrink-0',
              mode === 'creator'
                ? 'bg-white dark:bg-zinc-800 text-primary shadow-soft-sm font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            )}
          >
            <span className="sm:hidden">🎨 Studio</span>
            <span className="hidden sm:inline">🎨 Content Studio</span>
            <span className="text-[10px] opacity-70 font-normal hidden sm:inline">/ உருவாக்கி</span>
          </button>
        </div>

        {/* Right Tools: Clean English Summary Chip + Quota / PRO Pill */}
        <div className="flex items-center gap-2.5">
          {/* Summary Chip (English only) */}
          <div className="hidden sm:inline-flex items-center px-3 py-1 text-xs font-medium rounded-xl bg-warm-50 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 border border-stone-200/60 dark:border-zinc-700/60 shadow-2xs font-serif">
            {getSummaryChip()}
          </div>

          {/* Quota / PRO Pill */}
          {isPro ? (
            <div
              className="px-3 py-1 text-xs font-bold rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center gap-1.5 shadow-2xs"
              title={user?.subscriptionExpiryDate ? `Pro active until ${new Date(user.subscriptionExpiryDate).toLocaleDateString()}` : 'Pro Plan Active'}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>PRO</span>
            </div>
          ) : (
            <div
              className={cn(
                'px-3 py-1 text-xs font-semibold rounded-full border transition-all flex items-center gap-1.5 shadow-2xs',
                isZeroQuota
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 animate-pulse'
                  : isLowQuota
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400'
                  : 'bg-primary/8 dark:bg-primary/15 border-primary/20 text-primary dark:text-primary-300'
              )}
              title={isZeroQuota ? "Today's free generations are finished" : `${remaining}/${limit} generations remaining today`}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full', isZeroQuota ? 'bg-rose-500' : isLowQuota ? 'bg-amber-500' : 'bg-primary')} />
              <span>{remaining}/{limit} today</span>
            </div>
          )}
        </div>
      </div>

      {/* Textarea Area */}
      <div className="relative mt-3.5">
        <textarea
          ref={textareaRef}
          value={promptText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholderText}
          rows={2}
          className="w-full resize-none bg-warm-50/70 dark:bg-zinc-900/60 border border-[#E4DDD3] dark:border-zinc-800 rounded-2xl px-4 py-3 pr-10 text-sm text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all font-sans leading-relaxed shadow-2xs"
        />

        {promptText && (
          <button
            type="button"
            onClick={() => setPromptText('')}
            className="absolute top-3.5 right-3.5 p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-stone-200/60 dark:hover:bg-zinc-700 transition-colors"
            title={t('buttons.clear')}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Mode-Specific Option Dropdowns */}
      <div className="mt-2.5">
        {mode === 'poem' && <PoemOptions />}
        {mode === 'story' && <StoryOptions />}
        {mode === 'creator' && <CreatorOptions />}
      </div>

      {/* Bottom Bar: Character Counter & Generate Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3.5 mt-3 border-t border-[#EFEAE2] dark:border-[#262330]">
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <span className="text-xs font-medium text-zinc-400">
            {promptText.length}/500
          </span>
        </div>

        <button
          type="button"
          disabled={(!promptText.trim() && !uploadedMedia) || isStreaming}
          onClick={handleGenerate}
          className={cn(
            'w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 min-h-[46px] sm:min-h-[44px] text-sm font-semibold text-white rounded-2xl sm:rounded-xl shadow-soft-sm transition-all',
            'bg-[#6B5488] hover:bg-[#5E477A] active:scale-[0.98]',
            (!promptText.trim() && !uploadedMedia || isStreaming) && 'opacity-50 cursor-not-allowed shadow-none'
          )}
        >
          {isStreaming ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t('buttons.generating')}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>{t('buttons.generate')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
