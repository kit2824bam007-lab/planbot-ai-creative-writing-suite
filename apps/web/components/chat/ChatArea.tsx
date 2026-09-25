'use client';

import React, { useRef, useEffect, useState } from 'react';
import {
  Square,
  Plus,
  Edit2,
  Check,
  PanelLeft,
  Menu,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useChatStore } from '../../store/chatStore';
import { useChatStream } from '../../hooks/useChatStream';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { EmptyState } from './EmptyState';
import { WritingComposer } from '../generation/WritingComposer';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';

export const ChatArea: React.FC = () => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();

  const {
    messages,
    isStreaming,
    streamingContent,
    currentConversationId,
    setCurrentConversationId,
    setMessages,
    conversations,
    updateConversationTitle,
    isSidebarOpen,
    setIsSidebarOpen,
    user,
    quota
  } = useChatStore();

  const { stopStreaming } = useChatStream();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [isComposerFocused, setIsComposerFocused] = useState(false);

  const currentConv = conversations.find((c) => c.id === currentConversationId);
  const currentTitle = currentConv?.title || 'New Creative Writing';

  const hasMessages = messages.length > 0 || isStreaming;

  // Auto-scroll when new messages arrive, streaming, or composer expands
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent, isComposerFocused]);

  // Start editing conversation title
  const handleStartEdit = () => {
    setEditedTitle(currentTitle);
    setIsEditingTitle(true);
  };

  const handleSaveTitle = async () => {
    if (editedTitle.trim() && currentConversationId) {
      updateConversationTitle(currentConversationId, editedTitle.trim());
      await api.renameConversation(currentConversationId, editedTitle.trim()).catch(() => {});
    }
    setIsEditingTitle(false);
  };

  const handleNewChat = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setIsComposerFocused(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent relative">
      {/* Top Bar: Compact, clean, and mobile-optimized */}
      <header className="h-14 sm:h-16 border-b border-[#EAE3DA] dark:border-[#24212D] bg-[#FAF8F5]/85 dark:bg-[#15141A]/85 backdrop-blur-md px-3 sm:px-5 flex items-center justify-between z-20 shrink-0 gap-2">
        {/* MOBILE HEADER (md:hidden): ☰  🪶 PlanBot */}
        <div className="flex md:hidden items-center gap-2 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="p-1.5 -ml-0.5 rounded-xl text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-stone-200/50 dark:hover:bg-zinc-800 transition-colors shrink-0"
            title="Open Menu"
            aria-label="Open Sidebar Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1.5 overflow-hidden">
            <div className="w-7 h-7 rounded-lg bg-white dark:bg-white/95 p-0.5 border border-stone-200/60 dark:border-white/20 shadow-2xs flex items-center justify-center shrink-0">
              <img
                src="/logo-transparent.png"
                alt="PlanBot"
                width={20}
                height={20}
                className="w-5 h-5 object-contain"
              />
            </div>
            <span className="font-serif font-bold text-sm text-zinc-900 dark:text-zinc-100 tracking-tight">
              PlanBot
            </span>
          </div>
        </div>

        {/* DESKTOP HEADER (hidden md:flex): Preserves exact desktop title & sidebar controls */}
        <div className="hidden md:flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
          {!isSidebarOpen && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 rounded-xl text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-stone-200/50 dark:hover:bg-zinc-800 transition-colors"
                title="Open Sidebar"
              >
                <PanelLeft className="w-4 h-4" />
              </button>

              <div className="w-7 h-7 rounded-lg bg-white dark:bg-white/95 p-0.5 border border-stone-200/60 dark:border-white/20 shadow-2xs flex items-center justify-center shrink-0">
                <img
                  src="/logo-transparent.png"
                  alt="PlanBot"
                  width={20}
                  height={20}
                  className="w-5 h-5 object-contain"
                />
              </div>
            </div>
          )}

          {/* Editable Title */}
          {isEditingTitle ? (
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                className="text-xs sm:text-sm font-semibold bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 px-2.5 py-1 rounded-lg outline-none ring-1 ring-primary/40 font-serif w-full"
                autoFocus
              />
              <button
                type="button"
                onClick={handleSaveTitle}
                className="p-1 rounded-lg text-primary hover:bg-primary/10 shrink-0"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 group cursor-pointer min-w-0 flex-1 overflow-hidden" onClick={handleStartEdit}>
              <span className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate font-serif tracking-tight">
                {currentTitle}
              </span>
              <Edit2 className="w-3 h-3 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hidden sm:block" />
            </div>
          )}
        </div>

        {/* Right Info Controls: Theme Toggle & New Chat Button */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* PRO Badge if active */}
          {(quota?.isPro || (user?.plan === 'PRO' && user?.subscriptionStatus === 'ACTIVE')) && (
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/12 border border-amber-500/30 text-amber-700 dark:text-amber-400 shadow-2xs"
              title={user?.subscriptionExpiryDate ? `PRO active until ${new Date(user.subscriptionExpiryDate).toLocaleDateString()}` : 'PRO Member'}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>PRO</span>
            </div>
          )}

          {/* Dark / Light Toggle */}
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-1.5 rounded-xl text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-stone-200/50 dark:hover:bg-zinc-800 transition-colors"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* New Chat Button */}
          <button
            type="button"
            onClick={handleNewChat}
            className="inline-flex items-center gap-1 p-1.5 sm:px-3 sm:py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-zinc-800 hover:bg-stone-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-stone-200/70 dark:border-zinc-700 shadow-2xs transition-all"
            title="New Chat"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Piece</span>
          </button>
        </div>
      </header>

      {/* Main Message Scroll Area */}
      <div className={cn(
        "flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6 transition-all duration-200 ease-out",
        !hasMessages
          ? "pb-24 md:pb-4"
          : isComposerFocused
          ? "pb-[400px] sm:pb-[420px]"
          : "pb-28 sm:pb-32"
      )}>
        <div className="max-w-4xl lg:max-w-5xl mx-auto min-h-full flex flex-col justify-between">
          {!hasMessages ? (
            <EmptyState />
          ) : (
            <div className="space-y-2 pb-4">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}

              {/* Streaming AI Bubble */}
              {isStreaming && streamingContent && (
                <MessageBubble
                  message={{
                    id: 'streaming-active',
                    role: 'assistant',
                    content: streamingContent,
                    createdAt: new Date()
                  }}
                  isStreaming={true}
                />
              )}

              {/* Typing indicator when waiting for first token */}
              {isStreaming && !streamingContent && (
                <div className="mb-4">
                  <TypingIndicator />
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Writing Composer with 3 States */}
      <WritingComposer
        hasMessages={hasMessages}
        isExpanded={!hasMessages || isComposerFocused}
        onExpand={() => setIsComposerFocused(true)}
        onCollapse={() => setIsComposerFocused(false)}
      />
    </div>
  );
};
