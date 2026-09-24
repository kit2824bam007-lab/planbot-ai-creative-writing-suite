'use client';

import React, { useRef, useEffect, useState } from 'react';
import {
  Square,
  Plus,
  Radio,
  Sparkles,
  Edit2,
  Check,
  PanelLeft,
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
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-50 dark:bg-zinc-950 relative">
      {/* Top Bar */}
      <header className="h-14 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md px-4 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          {!isSidebarOpen && (
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Open Sidebar"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          )}

          {/* Editable Title */}
          {isEditingTitle ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                className="text-sm font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 px-2 py-1 rounded-md outline-none ring-1 ring-primary"
                autoFocus
              />
              <button
                type="button"
                onClick={handleSaveTitle}
                className="p-1 rounded text-primary hover:bg-primary/10"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group cursor-pointer" onClick={handleStartEdit}>
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[200px] sm:max-w-xs">
                {currentTitle}
              </span>
              <Edit2 className="w-3 h-3 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}
        </div>

        {/* Right Info Controls */}
        <div className="flex items-center gap-2.5">
          {/* System Online Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400">
            <Radio className="w-3 h-3 animate-pulse" />
            <span>System Online</span>
          </div>

          {/* PRO Badge if active */}
          {(quota?.isPro || (user?.plan === 'PRO' && user?.subscriptionStatus === 'ACTIVE')) && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 shadow-sm"
              title={user?.subscriptionExpiryDate ? `PRO active until ${new Date(user.subscriptionExpiryDate).toLocaleDateString()}` : 'PRO Member'}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>PRO</span>
            </div>
          )}

          {/* Model Selector Badge */}
          <div className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
            <Sparkles className="w-3 h-3 text-primary" />
            <span>Gemini 3.6 Flash</span>
          </div>

          {/* Dark / Light Toggle */}
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* New Chat Button */}
          <button
            type="button"
            onClick={handleNewChat}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Chat</span>
          </button>
        </div>
      </header>

      {/* Main Message Scroll Area */}
      <div className={cn(
        "flex-1 overflow-y-auto px-4 py-6 transition-all duration-200 ease-out",
        !hasMessages
          ? "pb-4"
          : isComposerFocused
          ? "pb-[380px] sm:pb-[420px]"
          : "pb-28 sm:pb-32"
      )}>
        <div className="max-w-3xl mx-auto min-h-full flex flex-col justify-between">
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
