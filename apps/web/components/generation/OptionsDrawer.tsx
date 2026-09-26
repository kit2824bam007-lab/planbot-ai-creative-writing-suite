'use client';

import React from 'react';
import { X, Sparkles, Globe, Sliders } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { PoemOptions } from './PoemOptions';
import { StoryOptions } from './StoryOptions';
import { CreatorOptions } from './CreatorOptions';
import { MediaUploader } from './MediaUploader';
import { cn } from '../../lib/utils';

export const OptionsDrawer: React.FC = () => {
  const {
    isOptionsDrawerOpen,
    setIsOptionsDrawerOpen,
    mode,
    setMode,
    language,
    setLanguage,
    quota,
    user
  } = useChatStore();

  if (!isOptionsDrawerOpen) return null;

  const isPro = Boolean(quota?.isPro || (user?.plan === 'PRO' && user?.subscriptionStatus === 'ACTIVE'));
  const remaining = quota?.remaining ?? 10;
  const limit = quota?.limit ?? 10;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Click outside backdrop */}
      <div
        className="fixed inset-0"
        onClick={() => setIsOptionsDrawerOpen(false)}
      />

      {/* Drawer / Sheet Content */}
      <div className="relative z-10 w-full max-w-xl bg-white dark:bg-[#181424] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-stone-200/80 dark:border-purple-900/30 max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-300">
        {/* Drawer Pull Handle (Mobile) */}
        <div className="w-12 h-1.5 bg-stone-300 dark:bg-zinc-700 rounded-full mx-auto mt-3 sm:hidden shrink-0" />

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-100 dark:border-zinc-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 font-serif">
                Creative Settings & Tools
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Choose format, meters, genres & media
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Bilingual Switcher */}
            <button
              type="button"
              onClick={() => setLanguage(language === 'ta' ? 'en' : 'ta')}
              className="px-2.5 py-1 rounded-xl bg-stone-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-stone-200 transition-colors flex items-center gap-1.5"
            >
              <Globe className="w-3.5 h-3.5 text-primary" />
              <span>{language === 'ta' ? 'தமிழ்' : 'English'}</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsOptionsDrawerOpen(false)}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body (Scrollable) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Mode Selector Tabs */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              Select Mode
            </label>
            <div className="grid grid-cols-3 gap-2 bg-[#F6F3F9] dark:bg-zinc-900/90 p-1.5 rounded-2xl border border-stone-200/60 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setMode('poem')}
                className={cn(
                  'py-2 px-3 text-xs font-semibold rounded-xl transition-all flex flex-col items-center justify-center gap-0.5',
                  mode === 'poem'
                    ? 'bg-white dark:bg-zinc-800 text-primary shadow-soft-sm font-bold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                )}
              >
                <span>📝 Poem</span>
                <span className="text-[10px] font-normal opacity-70">கவிதை</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('story')}
                className={cn(
                  'py-2 px-3 text-xs font-semibold rounded-xl transition-all flex flex-col items-center justify-center gap-0.5',
                  mode === 'story'
                    ? 'bg-white dark:bg-zinc-800 text-primary shadow-soft-sm font-bold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                )}
              >
                <span>📖 Story</span>
                <span className="text-[10px] font-normal opacity-70">கதை</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('creator')}
                className={cn(
                  'py-2 px-3 text-xs font-semibold rounded-xl transition-all flex flex-col items-center justify-center gap-0.5',
                  mode === 'creator'
                    ? 'bg-white dark:bg-zinc-800 text-primary shadow-soft-sm font-bold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                )}
              >
                <span>🎨 Studio</span>
                <span className="text-[10px] font-normal opacity-70">சமூக ஊடகம்</span>
              </button>
            </div>
          </div>

          {/* Mode Specific Dropdowns & Selectors */}
          <div className="bg-stone-50/70 dark:bg-zinc-900/50 p-4 rounded-2xl border border-stone-200/60 dark:border-zinc-800">
            {mode === 'poem' && <PoemOptions />}
            {mode === 'story' && <StoryOptions />}
            {mode === 'creator' && <CreatorOptions />}
          </div>

          {/* Media Awareness Section */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              Attach Inspiration Media (Optional)
            </label>
            <MediaUploader />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-stone-100 dark:border-zinc-800/80 flex items-center justify-between shrink-0 bg-stone-50/50 dark:bg-zinc-900/30">
          <div className="text-xs text-zinc-500">
            {isPro ? (
              <span className="text-amber-600 font-semibold">✦ Pro Plan Active</span>
            ) : (
              <span>{remaining}/{limit} free uses today</span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsOptionsDrawerOpen(false)}
            className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-all shadow-soft-sm active:scale-95"
          >
            Apply & Done
          </button>
        </div>
      </div>
    </div>
  );
};
