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

  if (isUser) {
    return (
      <div className="flex justify-end mb-4 animate-fade-in">
        <div className="flex items-end gap-2 max-w-[85%] sm:max-w-[75%]">
          <div className="bg-gradient-to-br from-violet-500 to-purple-600 text-white px-4 py-3 rounded-2xl rounded-br-sm shadow-md text-sm leading-relaxed">
            <p className="whitespace-pre-wrap font-sans">{message.content}</p>
          </div>
          <div className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/60 flex items-center justify-center text-primary shrink-0 shadow-sm">
            <User className="w-4 h-4" />
          </div>
        </div>
      </div>
    );
  }

  // AI Message
  return (
    <div className="flex justify-start mb-6 animate-fade-in">
      <div className="flex items-start gap-3 max-w-[95%] sm:max-w-[88%]">
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-sm mt-0.5">
          <Bot className="w-4 h-4" />
        </div>

        {/* Content Box */}
        <div className="flex-1 space-y-2 overflow-hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 tracking-wide">
              PlanBot AI
            </span>
            {message.metadata?.poemType && (
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800 text-primary rounded-full">
                {message.metadata.poemType}
              </span>
            )}
            {message.metadata?.language === 'ta' && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 rounded-md">
                தமிழ்
              </span>
            )}
            {message.metadata?.mediaType === 'image' && (
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 rounded-full flex items-center gap-1">
                <span>📷</span> Image-aware content
              </span>
            )}
            {message.metadata?.mediaType === 'video' && (
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 rounded-full flex items-center gap-1">
                <span>🎥</span> Video-aware content
              </span>
            )}
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-sm text-sm text-zinc-800 dark:text-zinc-200 poem-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-2 leading-relaxed whitespace-pre-wrap">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold text-zinc-900 dark:text-zinc-50">{children}</strong>,
              }}
            >
              {message.content}
            </ReactMarkdown>

            {isStreaming && <span className="streaming-cursor" />}
          </div>

          {/* Under-bubble Actions & Originality Screening (only when not streaming) */}
          {!isStreaming && (
            <>
              <ActionButtonsRow message={message} />
              <OriginalityScreeningCard message={message} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
