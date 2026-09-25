'use client';

import React from 'react';
import { Sparkles, Feather, ScrollText, BookOpen, Compass } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';

export const EmptyState: React.FC = () => {
  const { setPromptText, setMode, setPoemType, setLanguage } = useChatStore();

  const suggestions = [
    {
      icon: Feather,
      title: 'Haiku Inspiration',
      category: 'Poem Mode · Haiku',
      prompt: 'A gentle raindrop glistening on a lotus leaf at dawn',
      action: () => {
        setMode('poem');
        setPoemType('Haiku');
        setLanguage('en');
        setPromptText('A gentle raindrop glistening on a lotus leaf at dawn');
      }
    },
    {
      icon: ScrollText,
      title: 'Shakespearean Sonnet',
      category: 'Poem Mode · Sonnet',
      prompt: 'Love enduring through the cruel changes of relentless time',
      action: () => {
        setMode('poem');
        setPoemType('Sonnet');
        setLanguage('en');
        setPromptText('Love enduring through the cruel changes of relentless time');
      }
    },
    {
      icon: BookOpen,
      title: 'Story Prompt Idea',
      category: 'Story Mode · Drama',
      prompt: 'Two childhood artists meet after 20 years at an exhibition in Chennai',
      action: () => {
        setMode('story');
        setPromptText('Two childhood artists meet after 20 years at an exhibition in Chennai');
      }
    },
    {
      icon: Compass,
      title: 'Diversity Experiment',
      category: 'Classical Tamil · வெண்பா',
      prompt: 'நிலவின் அழகும் மலரின் நறுமணமும் இணையும் இரவு',
      action: () => {
        setMode('poem');
        setPoemType('வெண்பா');
        setLanguage('ta');
        setPromptText('நிலவின் அழகும் மலரின் நறுமணமும் இணையும் இரவு');
      }
    }
  ];

  return (
    <div className="relative flex flex-col items-center justify-center py-8 sm:py-12 px-4 text-center max-w-3xl mx-auto my-auto animate-fade-in select-none">
      {/* Ethereal Ambient Sphere Blur (Inspired by reference image) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-12 w-64 h-64 sm:w-72 sm:h-72 rounded-full bg-gradient-to-tr from-purple-200/40 via-violet-200/30 to-pink-100/40 dark:from-purple-900/20 dark:via-violet-900/15 dark:to-pink-900/15 blur-3xl pointer-events-none -z-10" />

      {/* Official Feather/Quill Brand Logo */}
      <div className="relative mb-5 group">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-white/95 dark:bg-white/95 border border-[#E8E1D7] dark:border-white/20 shadow-soft-md flex items-center justify-center p-3 backdrop-blur-sm transition-transform duration-300 group-hover:scale-105">
          <img
            src="/logo-transparent.png"
            alt="PlanBot Logo"
            width={64}
            height={64}
            className="w-full h-full max-w-[64px] max-h-[64px] object-contain transition-all"
          />
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center text-primary backdrop-blur-xs">
          <Sparkles className="w-3 h-3" />
        </div>
      </div>

      {/* Editorial Heading */}
      <h1 className="font-serif text-2xl sm:text-4xl text-zinc-900 dark:text-zinc-50 tracking-tight font-medium max-w-xl leading-tight">
        What masterpiece shall we compose today?
      </h1>
      <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-2.5 max-w-lg leading-relaxed font-sans">
        Explore classical meters, lyrical verses, compelling stories, or create media-aware social content in Tamil and English.
      </p>

      {/* 4 Cards Grid with Refined Desktop Polish */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full mt-8 text-left">
        {suggestions.map((card, i) => {
          const Icon = card.icon;
          return (
            <button
              key={i}
              type="button"
              onClick={card.action}
              className="flex items-start gap-3.5 p-4 rounded-2xl bg-white/85 dark:bg-zinc-900/65 border border-[#E8E2D9] dark:border-[#262330] hover:border-primary/40 hover:bg-white dark:hover:bg-zinc-900/90 shadow-soft-sm hover:shadow-soft-md transition-all group active:scale-[0.99]"
            >
              <div className="p-2.5 rounded-xl bg-warm-100 dark:bg-zinc-800/90 text-primary shrink-0 group-hover:bg-primary/12 transition-colors border border-stone-200/50 dark:border-zinc-700/50">
                <Icon className="w-4 h-4 stroke-[1.8]" />
              </div>
              <div className="overflow-hidden min-w-0">
                <div className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                  {card.category}
                </div>
                <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-100 mt-0.5 group-hover:text-primary transition-colors font-serif truncate">
                  {card.title}
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-1 font-sans">
                  "{card.prompt}"
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
