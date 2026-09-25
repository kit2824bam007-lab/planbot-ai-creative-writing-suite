'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User } from 'lucide-react';
import { ChatMessage } from '../../types';
import { ActionButtonsRow } from './ActionButtonsRow';
import { OriginalityScreeningCard } from './OriginalityScreeningCard';
import { cn } from '../../lib/utils';

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isStreaming = false }) => {
  const isUser = message.role === 'user';
  const isPoem = message.metadata?.mode === 'poem' || Boolean(message.metadata?.poemType);

  if (isUser) {
    return (
      <div className="flex justify-end mb-5 animate-fade-in">
        <div className="flex items-end gap-2.5 max-w-[85%] sm:max-w-[75%]">
          <div className="bg-[#6B5488] text-white px-4 py-3 rounded-2xl rounded-br-xs shadow-soft-sm text-sm sm:text-base leading-relaxed font-sans">
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-warm-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-stone-200/60 dark:border-zinc-700/60 flex items-center justify-center shrink-0 shadow-2xs">
            <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
      </div>
    );
  }

  // AI Message
  return (
    <div className="flex justify-start mb-6 animate-fade-in">
      <div className="flex items-start gap-3 sm:gap-3.5 max-w-[98%] sm:max-w-[92%] w-full">
        {/* Official Feather/Quill Avatar */}
        <div className="w-8 h-8 rounded-xl bg-white dark:bg-white/95 border border-stone-200/70 dark:border-white/20 flex items-center justify-center shrink-0 shadow-2xs mt-0.5 p-1">
          <img
            src="/logo-transparent.png"
            alt="PlanBot AI"
            width={24}
            height={24}
            className="w-full h-full max-w-[24px] max-h-[24px] object-contain"
          />
        </div>

        {/* Content Box */}
        <div className="flex-1 space-y-2 overflow-hidden min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight font-serif">
              PlanBot AI
            </span>
            {message.metadata?.mode === 'story' ? (
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-full">
                Story · {message.metadata?.genre || 'Narrative'}
              </span>
            ) : message.metadata?.mode === 'creator' ? (
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-pink-500/10 border border-pink-500/20 text-pink-700 dark:text-pink-300 rounded-full">
                Creator · {message.metadata?.platform || 'Social'}
              </span>
            ) : message.metadata?.poemType ? (
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary dark:text-primary-300 rounded-full">
                {message.metadata.poemType}
              </span>
            ) : null}
            {message.metadata?.language === 'ta' && (
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 rounded-md">
                தமிழ்
              </span>
            )}
            {message.metadata?.mediaType === 'image' && (
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 rounded-full flex items-center gap-1">
                <span>📷</span> Image-aware
              </span>
            )}
            {message.metadata?.mediaType === 'video' && (
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 rounded-full flex items-center gap-1">
                <span>🎥</span> Video-aware
              </span>
            )}
          </div>

          <div className={cn(
            "bg-white/95 dark:bg-[#181622]/90 border border-[#E8E2D9] dark:border-[#282534] rounded-3xl p-5 sm:p-7 shadow-soft-md text-zinc-800 dark:text-zinc-100 poem-content transition-all",
            isPoem ? "font-serif text-base sm:text-lg leading-loose tracking-wide" : "font-sans text-sm sm:text-base leading-relaxed"
          )}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-3 leading-relaxed whitespace-pre-wrap">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold text-zinc-900 dark:text-zinc-50">{children}</strong>,
                h1: ({ children }) => <h1 className="font-serif text-xl sm:text-2xl font-bold mb-3 text-zinc-900 dark:text-zinc-50">{children}</h1>,
                h2: ({ children }) => <h2 className="font-serif text-lg sm:text-xl font-semibold mb-2 text-zinc-900 dark:text-zinc-50">{children}</h2>,
                h3: ({ children }) => <h3 className="font-serif text-base sm:text-lg font-semibold mb-2 text-zinc-900 dark:text-zinc-50">{children}</h3>,
              }}
            >
              {message.content}
            </ReactMarkdown>

            {isStreaming && <span className="streaming-cursor" />}
          </div>

          {/* Under-bubble Actions & Originality Screening (only when not streaming) */}
          {!isStreaming && (
            <div className="space-y-2 pt-1">
              <ActionButtonsRow message={message} />
              <OriginalityScreeningCard message={message} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
