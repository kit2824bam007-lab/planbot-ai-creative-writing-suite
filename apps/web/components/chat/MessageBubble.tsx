'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
      <div className="flex justify-end mb-4 animate-fade-in">
        <div className="flex items-end gap-2 max-w-[85%] sm:max-w-[75%]">
          {/* User Message Bubble */}
          <div className="bg-white/95 dark:bg-[#1F192C]/95 text-zinc-900 dark:text-zinc-100 px-4 sm:px-5 py-3 rounded-3xl rounded-br-md shadow-[0_4px_20px_-2px_rgba(110,80,140,0.06)] border border-stone-200/70 dark:border-purple-900/40 text-sm sm:text-base leading-relaxed font-sans">
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        </div>
      </div>
    );
  }

  // AI Message
  return (
    <div className="flex justify-start mb-6 animate-fade-in">
      <div className="flex items-start gap-2.5 sm:gap-3.5 max-w-full sm:max-w-[92%] w-full">
        {/* Purple/Violet Gradient Avatar Dot */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-indigo-500 p-0.5 shadow-soft-sm shrink-0 mt-0.5 flex items-center justify-center">
          <div className="w-full h-full rounded-full bg-white dark:bg-[#120D1A] flex items-center justify-center overflow-hidden p-1">
            <img
              src="/logo-transparent.png"
              alt="DreamInk AI"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Content Box */}
        <div className="flex-1 space-y-2.5 overflow-hidden min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight font-serif">
              DreamInk AI
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
          </div>

          {/* Message Content Bubble */}
          <div className={cn(
            "bg-white/95 dark:bg-[#181424]/90 border border-stone-200/70 dark:border-purple-900/40 rounded-3xl p-5 sm:p-7 shadow-[0_4px_24px_-2px_rgba(110,80,140,0.06)] text-zinc-800 dark:text-zinc-100 poem-content transition-all",
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
