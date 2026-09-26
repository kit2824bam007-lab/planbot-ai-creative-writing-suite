'use client';

import React from 'react';
import { Sparkles, Dices, Image as ImageIcon, ScrollText, Lightbulb, ChevronRight } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';

export const EmptyState: React.FC = () => {
  const {
    user,
    quota,
    setPromptText,
    setMode,
    setPoemType,
    setLanguage,
    setIsLimitModalOpen,
    setIsOptionsDrawerOpen
  } = useChatStore();

  const userName = user?.name ? user.name.split(' ')[0] : 'Hendricks';

  const actionCards = [
    {
      icon: Dices,
      title: 'Surprise me!',
      desc: 'Surprise me with a creative idea or story.',
      action: () => {
        const surprises = [
          'Two childhood artists meet after 20 years at an exhibition in Chennai',
          'A gentle raindrop glistening on a lotus leaf at dawn',
          'A time traveler who can only communicate through classical poems',
          'நிலவின் அழகும் மலரின் நறுமணமும் இணையும் இரவின் அமைதி'
        ];
        const randomItem = surprises[Math.floor(Math.random() * surprises.length)];
        setPromptText(randomItem);
        if (/[\u0B80-\u0BFF]/.test(randomItem)) {
          setLanguage('ta');
        }
      }
    },
    {
      icon: ImageIcon,
      title: 'Create content',
      desc: 'Create viral social posts from your idea or media.',
      action: () => {
        setMode('creator');
        setIsOptionsDrawerOpen(true);
      }
    },
    {
      icon: ScrollText,
      title: 'Poem & Verses',
      desc: 'Compose in classical meters, Haiku, or வெண்பா.',
      action: () => {
        setMode('poem');
        setPoemType('Haiku');
        setPromptText('Golden sunset melting across the silent ocean waves');
      }
    },
    {
      icon: Lightbulb,
      title: 'Generate ideas',
      desc: 'Brainstorm concepts, plot twists, and narratives.',
      action: () => {
        setMode('story');
        setPromptText('An undercover detective who realizes the suspect is their mentor');
      }
    }
  ];

  return (
    <div className="relative flex flex-col items-center justify-center pt-2 sm:pt-6 pb-2 px-3 sm:px-4 text-center max-w-xl mx-auto my-auto animate-fade-in select-none">
      {/* Soft Ambient Ethereal Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-gradient-to-tr from-purple-300/30 via-violet-300/25 to-pink-200/25 dark:from-purple-900/25 dark:via-violet-900/20 dark:to-pink-900/15 blur-3xl pointer-events-none -z-10" />

      {/* Greeting Header (Exactly matching Screen 1 reference) */}
      <div className="mb-6 sm:mb-8 text-center">
        <h2 className="text-sm sm:text-base font-medium text-zinc-500 dark:text-zinc-400 font-sans tracking-tight">
          Hi, {userName}
        </h2>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight mt-1 font-serif">
          How can I help today?
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 dark:text-zinc-500 mt-2 max-w-sm mx-auto font-sans leading-relaxed">
          I’m here to help — from quick verses to smart creative recommendations.
        </p>
      </div>

      {/* 2x2 Rounded Cards Grid (Directly matching Screen 1 reference) */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 w-full text-left">
        {actionCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <button
              key={i}
              type="button"
              onClick={card.action}
              className="p-3.5 sm:p-4 rounded-3xl bg-white/90 dark:bg-[#1C1826]/90 border border-stone-200/70 dark:border-zinc-800/80 hover:border-primary/40 dark:hover:border-primary/50 shadow-[0_4px_20px_-2px_rgba(110,80,140,0.06)] hover:shadow-soft-md transition-all duration-200 group active:scale-[0.98] flex flex-col justify-between min-h-[110px] sm:min-h-[125px]"
            >
              <div className="flex items-center justify-between w-full">
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-zinc-800/80 text-primary group-hover:bg-primary/10 transition-colors">
                  <Icon className="w-4 h-4 stroke-[2]" />
                </div>
              </div>
              <div className="mt-2.5">
                <div className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-100 group-hover:text-primary transition-colors font-serif">
                  {card.title}
                </div>
                <div className="text-[11px] text-zinc-400 dark:text-zinc-500 line-clamp-2 mt-0.5 leading-snug font-sans">
                  {card.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* PRO / Quota Banner (Matching Reference Screen 1 "Unlock more features with Pro") */}
      <button
        type="button"
        onClick={() => setIsLimitModalOpen(true)}
        className="mt-4 sm:mt-5 w-full py-2.5 px-4 rounded-2xl bg-white/70 dark:bg-[#1B1726]/70 border border-purple-200/50 dark:border-purple-900/40 hover:bg-white dark:hover:bg-[#1F1A2D] text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-between shadow-2xs transition-all active:scale-[0.99] group"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
          <span>Unlock more features with Pro</span>
        </div>
        <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
      </button>
    </div>
  );
};
