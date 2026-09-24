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
    <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-md p-4 mb-4 transition-all">
      {/* Top Header: Mode Tabs + Summary Chip + Quota Pill */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
        {/* Mode Tabs (Bilingual: English primary, Tamil secondary small text) */}
        <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setMode('poem')}
            className={cn(
              'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1',
              mode === 'poem'
                ? 'bg-white dark:bg-zinc-900 text-primary shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            )}
          >
            <span>📜 Poem Mode</span>
            <span className="text-[10px] opacity-75 font-normal">/ கவிதை</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('story')}
            className={cn(
              'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1',
              mode === 'story'
                ? 'bg-white dark:bg-zinc-900 text-primary shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            )}
          >
            <span>📖 Story Mode</span>
            <span className="text-[10px] opacity-75 font-normal">/ கதை</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('creator')}
            className={cn(
              'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1',
              mode === 'creator'
                ? 'bg-white dark:bg-zinc-900 text-primary shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            )}
          >
            <span>📱 Content Creator</span>
            <span className="text-[10px] opacity-75 font-normal">/ உருவாக்கி</span>
          </button>
        </div>

        {/* Right Tools: Clean English Summary Chip + Quota / PRO Pill */}
        <div className="flex items-center gap-2.5">
          {/* Summary Chip (English only) */}
          <div className="hidden sm:inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
            {getSummaryChip()}
          </div>

          {/* Quota / PRO Pill */}
          {isPro ? (
            <div
              className="px-3 py-1 text-xs font-bold rounded-full border border-amber-500/40 bg-gradient-to-r from-amber-500/15 to-yellow-500/15 text-amber-600 dark:text-amber-400 flex items-center gap-1.5 shadow-sm"
              title={user?.subscriptionExpiryDate ? `Pro active until ${new Date(user.subscriptionExpiryDate).toLocaleDateString()}` : 'Pro Plan Active'}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>PRO</span>
            </div>
          ) : (
            <div
              className={cn(
                'px-3 py-1 text-xs font-semibold rounded-full border transition-all flex items-center gap-1.5',
                isZeroQuota
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 animate-pulse'
                  : isLowQuota
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-600 dark:text-amber-400'
                  : 'bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300'
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
      <div className="relative mt-3">
        <textarea
          ref={textareaRef}
          value={promptText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholderText}
          rows={2}
          className="w-full resize-none bg-zinc-50/70 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3.5 py-2.5 pr-10 text-sm text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all font-sans"
        />

        {promptText && (
          <button
            type="button"
            onClick={() => setPromptText('')}
            className="absolute top-2.5 right-2.5 p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            title={t('buttons.clear')}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Mode-Specific Option Dropdowns */}
      {mode === 'poem' && <PoemOptions />}
      {mode === 'story' && <StoryOptions />}
      {mode === 'creator' && <CreatorOptions />}

      {/* Bottom Bar: Character Counter & Gradient Generate Button */}
      <div className="flex items-center justify-between pt-3 mt-2 border-t border-zinc-100 dark:border-zinc-800">
        <span className="text-xs font-medium text-zinc-400">
          {promptText.length}/500
        </span>

        <button
          type="button"
          disabled={(!promptText.trim() && !uploadedMedia) || isStreaming}
          onClick={handleGenerate}
          className={cn(
            'inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-xl shadow-md transition-all',
            'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 active:scale-[0.98]',
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
