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
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center max-w-2xl mx-auto my-auto animate-fade-in">
      {/* Sparkle Icon & Greeting */}
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 to-purple-500 text-white flex items-center justify-center shadow-lg shadow-primary/20 mb-4">
        <Sparkles className="w-7 h-7" />
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
        What masterpiece shall we compose today?
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 max-w-md">
        Explore classical meters, lyrical verses, compelling stories, or create stunning social cards in Tamil, English, and more.
      </p>

      {/* 4 Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mt-8">
        {suggestions.map((card, i) => {
          const Icon = card.icon;
          return (
            <button
              key={i}
              type="button"
              onClick={card.action}
              className="flex items-start gap-3 p-3.5 rounded-xl text-left bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-primary/50 dark:hover:border-primary/50 hover:shadow-md transition-all group"
            >
              <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-primary shrink-0 group-hover:bg-primary/10 transition-colors">
                <Icon className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <div className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                  {card.category}
                </div>
                <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5 group-hover:text-primary transition-colors">
                  {card.title}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-1">
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
