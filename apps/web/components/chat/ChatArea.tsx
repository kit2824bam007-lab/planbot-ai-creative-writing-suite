'use client';

import React, { useRef, useEffect, useState } from 'react';
import {
  Plus,
  Edit2,
  Check,
  PanelLeft,
  Menu,
  Sun,
  Moon,
  Sparkles,
  Share2
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
    quota,
    setIsLimitModalOpen
  } = useChatStore();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');

  const currentConv = conversations.find((c) => c.id === currentConversationId);
  const currentTitle = currentConv?.title || (messages.length > 0 ? 'Conversation' : 'DreamInk AI');

  const hasMessages = messages.length > 0 || isStreaming;

  // Auto-scroll when new messages arrive or while streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

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
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent relative">
      {/* Top Header: Clean, frosted, matching reference picture */}
      <header className="h-14 sm:h-16 border-b border-purple-100/60 dark:border-purple-950/40 bg-white/60 dark:bg-[#130E1B]/60 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between z-20 shrink-0 gap-2">
        {/* Left: Mobile hamburger menu or Desktop sidebar toggle */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 -ml-1 rounded-2xl text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/80 dark:hover:bg-zinc-800 transition-colors shrink-0 shadow-2xs"
            title="Toggle Sidebar"
            aria-label="Toggle Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Title or Logo */}
          {isEditingTitle ? (
            <div className="flex items-center gap-1.5 min-w-0 max-w-[200px] sm:max-w-xs">
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                className="text-xs sm:text-sm font-semibold bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 px-2.5 py-1 rounded-xl outline-none ring-2 ring-primary/40 font-serif w-full shadow-2xs"
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
            <div
              className="flex items-center gap-2 group cursor-pointer min-w-0 overflow-hidden"
              onClick={hasMessages ? handleStartEdit : undefined}
            >
              <span className="text-sm sm:text-base font-semibold text-zinc-800 dark:text-zinc-100 truncate font-serif tracking-tight">
                {currentTitle}
              </span>
              {hasMessages && (
                <Edit2 className="w-3.5 h-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hidden sm:block" />
              )}
            </div>
          )}
        </div>

        {/* Right Info Controls: Pro Pill, Theme Toggle, New Chat */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Pro Pill */}
          <button
            type="button"
            onClick={() => setIsLimitModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300 shadow-2xs hover:bg-amber-500/15 transition-all"
            title="Subscription & Quota"
          >
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span className="hidden sm:inline">PRO</span>
            <span>{quota?.isPro ? 'Active' : `${quota?.remaining ?? 10} left`}</span>
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-2xl text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-white/80 dark:hover:bg-zinc-800 transition-colors shadow-2xs"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* New Piece Button */}
          <button
            type="button"
            onClick={handleNewChat}
            className="inline-flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 text-xs font-semibold rounded-2xl bg-white dark:bg-zinc-800 hover:bg-stone-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100 border border-stone-200/70 dark:border-zinc-700 shadow-2xs transition-all active:scale-95"
            title="New Chat"
          >
            <Plus className="w-4 h-4 text-primary" />
            <span className="hidden sm:inline">New</span>
          </button>
        </div>
      </header>

      {/* Main Message Scroll Area */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 transition-all duration-200 ease-out">
        <div className="max-w-2xl lg:max-w-3xl mx-auto min-h-full flex flex-col justify-between">
          {!hasMessages ? (
            <EmptyState />
          ) : (
            <div className="space-y-4 pb-6">
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

      {/* Sleek Floating Pill Composer */}
      <WritingComposer hasMessages={hasMessages} />
    </div>
  );
};
