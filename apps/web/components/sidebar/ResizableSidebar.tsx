'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Plus,
  Search,
  PanelLeftClose,
  Compass,
  Command,
  X
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

  // Auto-close sidebar on mobile devices upon initial mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, [setIsSidebarOpen]);

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
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  if (!isSidebarOpen) return null;

  return (
    <>
      {/* Mobile Backdrop Overlay (only on small screens < md) */}
      <div
        onClick={() => setIsSidebarOpen(false)}
        className="fixed inset-0 bg-stone-900/30 dark:bg-black/60 backdrop-blur-xs z-30 md:hidden transition-opacity"
      />

      <aside
        style={{ width: `${sidebarWidth}px` }}
        className="fixed md:relative top-0 bottom-0 left-0 flex flex-col h-full max-w-[85vw] bg-[#FAF8F5]/98 dark:bg-[#15141A]/98 backdrop-blur-md border-r border-[#E8E2D9] dark:border-[#262330] select-none z-40 md:z-30 shrink-0 shadow-2xl md:shadow-none transition-transform"
      >
        {/* Top Header: Feather Logo & Brand Area */}
        <div className="h-14 sm:h-16 px-3.5 sm:px-4 border-b border-[#EAE3DA] dark:border-[#24212D] flex items-center justify-between shrink-0 gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
            <div className="relative w-8 h-8 rounded-xl bg-white dark:bg-white/95 p-0.5 shadow-soft-sm border border-stone-200/60 dark:border-white/20 flex items-center justify-center shrink-0">
              <img
                src="/logo-transparent.png"
                alt="PlanBot"
                width={24}
                height={24}
                className="w-6 h-6 object-contain transition-transform"
              />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 font-serif">
                <span className="truncate">PlanBot AI</span>
                <span className="text-[10px] font-sans font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0">
                  v1.0
                </span>
              </div>
              <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-sans tracking-wide truncate">
                Creative Writing Workspace
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="p-1.5 rounded-xl bg-stone-200/70 hover:bg-stone-300/80 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 transition-colors shrink-0 flex items-center justify-center shadow-2xs"
            title="Close Sidebar"
          >
            <X className="w-4 h-4 md:hidden" />
            <PanelLeftClose className="w-4 h-4 hidden md:block" />
          </button>
        </div>

        {/* Action: Refined New Chat & Search */}
        <div className="p-3 space-y-2.5">
          <button
            type="button"
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-white rounded-xl shadow-soft-sm bg-[#6B5488] hover:bg-[#5E477A] active:scale-[0.99] transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Composition</span>
          </button>

          {/* Ctrl+K Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search compositions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/80 dark:bg-zinc-900/60 border border-[#E5DFD5] dark:border-zinc-800 focus:border-primary/50 focus:bg-white dark:focus:bg-zinc-900 rounded-xl pl-8 pr-11 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 outline-none transition-all shadow-2xs"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[10px] text-zinc-400 bg-stone-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-stone-200/70 dark:border-zinc-700/60 font-mono">
              <Command className="w-2.5 h-2.5" />
              <span>K</span>
            </div>
          </div>
        </div>

        {/* Conversation List Scroll Area */}
        <div className="flex-1 overflow-y-auto px-3 space-y-4">
          {/* Workspace Badge */}
          <div>
            <div className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-2 py-1">
              Workspace
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-white/60 dark:bg-zinc-900/40 border border-stone-200/50 dark:border-zinc-800/60 rounded-xl shadow-2xs">
              <Compass className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="truncate">Literary & Social Studio</span>
            </div>
          </div>

          {/* Conversations History */}
          <div>
            <div className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-2 py-1">
              Recent Compositions
            </div>
            <ConversationList searchQuery={searchQuery} />
          </div>
        </div>

        {/* User Profile Menu at Bottom */}
        <UserMenu />

        {/* Resize Handle Drag Bar */}
        <div
          onMouseDown={startResizing}
          className={cn(
            'absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-primary/40 transition-colors hidden md:block',
            isResizing && 'bg-primary/70 w-1.5'
          )}
        />
      </aside>
    </>
  );
};
