'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Plus,
  Search,
  PanelLeftClose,
  Compass,
  Command
} from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { ConversationList } from './ConversationList';
import { UserMenu } from './UserMenu';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';

export const ResizableSidebar: React.FC = () => {
  const {
    sidebarWidth,
    setSidebarWidth,
    isSidebarOpen,
    setIsSidebarOpen,
    setCurrentConversationId,
    setMessages,
    setConversations
  } = useChatStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isResizing, setIsResizing] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load persisted width & conversations on mount
  useEffect(() => {
    const savedWidth = localStorage.getItem('planbot_sidebar_width');
    if (savedWidth) {
      setSidebarWidth(Math.min(Math.max(parseInt(savedWidth, 10), 260), 400));
    }

    // Fetch conversations list
    api.getConversations().then((res) => {
      if (res && res.conversations) {
        setConversations(res.conversations);
      }
    }).catch(() => {});
  }, [setSidebarWidth, setConversations]);

  // Global Ctrl+K shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Resizing logic (260px - 400px)
  const startResizing = () => {
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.min(Math.max(e.clientX, 260), 400);
      setSidebarWidth(newWidth);
      localStorage.setItem('planbot_sidebar_width', String(newWidth));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, setSidebarWidth]);

  const handleNewChat = () => {
    setCurrentConversationId(null);
    setMessages([]);
  };

  if (!isSidebarOpen) return null;

  return (
    <aside
      style={{ width: `${sidebarWidth}px` }}
      className="relative flex flex-col h-full bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 select-none z-30 shrink-0"
    >
      {/* Top Header: Brand Logo & Close Button */}
      <div className="h-14 px-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-purple-500 text-white flex items-center justify-center shadow-md shadow-primary/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span>PlanBot AI</span>
              <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                v1.0
              </span>
            </div>
            <div className="text-[10px] text-zinc-400 font-medium">
              Creative Writing Suite
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsSidebarOpen(false)}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title="Collapse Sidebar"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* Action: Gradient + New Chat */}
      <div className="p-3">
        <button
          type="button"
          onClick={handleNewChat}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white rounded-xl shadow-sm bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 active:scale-[0.99] transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </button>

        {/* Debounced Ctrl+K Search Bar */}
        <div className="mt-2.5 relative">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-100/80 dark:bg-zinc-800/80 border border-transparent focus:border-primary/40 rounded-xl pl-8 pr-12 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 outline-none transition-all"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[10px] text-zinc-400 bg-white dark:bg-zinc-700 px-1 py-0.5 rounded border border-zinc-200 dark:border-zinc-600">
            <Command className="w-2.5 h-2.5" />
            <span>K</span>
          </div>
        </div>
      </div>

      {/* Conversation List Scroll Area */}
      <div className="flex-1 overflow-y-auto px-3 space-y-4">
        {/* Workspace Section */}
        <div>
          <div className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-2 py-1">
            Workspace
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100/60 dark:bg-zinc-800/40 rounded-lg">
            <Compass className="w-3.5 h-3.5 text-primary" />
            <span>AI Literary Assistant</span>
          </div>
        </div>

        {/* Conversations History */}
        <div>
          <div className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-2 py-1">
            Recent Compositions
          </div>
          <ConversationList searchQuery={searchQuery} />
        </div>
      </div>

      {/* User Avatar Menu at Bottom */}
      <UserMenu />

      {/* Resize Handle Drag Bar */}
      <div
        onMouseDown={startResizing}
        className={cn(
          'absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-primary/50 transition-colors',
          isResizing && 'bg-primary w-2'
        )}
      />
    </aside>
  );
};
