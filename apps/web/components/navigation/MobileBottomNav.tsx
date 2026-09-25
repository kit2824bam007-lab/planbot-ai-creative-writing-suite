'use client';

import React from 'react';
import { Home, Clock, PenTool, User } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useKeyboardStatus } from '../../hooks/useKeyboardStatus';
import { cn } from '../../lib/utils';

export const MobileBottomNav: React.FC = () => {
  const isKeyboardOpen = useKeyboardStatus();
  const {
    isSidebarOpen,
    setIsSidebarOpen,
    setCurrentConversationId,
    setMessages,
    messages,
    user,
    setIsLimitModalOpen
  } = useChatStore();

  const handleHomeClick = () => {
    if (isSidebarOpen) {
      setIsSidebarOpen(false);
    }
    // Scroll smoothly to top of chat area
    const chatContainer = document.querySelector('.overflow-y-auto');
    if (chatContainer) {
      chatContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleHistoryClick = () => {
    setIsSidebarOpen(true);
  };

  const handleCreateClick = () => {
    if (isSidebarOpen) {
      setIsSidebarOpen(false);
    }
    setCurrentConversationId(null);
    setMessages([]);
    // Smooth scroll to composer
    setTimeout(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.focus();
      }
    }, 100);
  };

  const handleProfileClick = () => {
    if (user) {
      // If user is authenticated, open sidebar drawer showing their profile and settings
      setIsSidebarOpen(true);
    } else {
      // If guest, open the upgrade / login modal
      setIsLimitModalOpen(true);
    }
  };

  // In chat mode (messages exist) or when phone keyboard is open, hide the bottom nav
  // so the message composer sits directly on top of the phone keyboard without interference!
  if (messages.length > 0 || isKeyboardOpen) {
    return null;
  }

  // Determine active item based on current app state
  const isHistoryActive = isSidebarOpen;
  const isCreateActive = !isSidebarOpen && messages.length === 0;
  const isHomeActive = !isSidebarOpen && messages.length > 0;

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/92 dark:bg-[#16141D]/92 backdrop-blur-xl border-t border-[#EAE3DA]/80 dark:border-[#24212D]/80 shadow-[0_-4px_24px_-2px_rgba(90,70,110,0.06)] dark:shadow-[0_-4px_24px_-2px_rgba(0,0,0,0.35)] px-3 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* Home */}
        <button
          type="button"
          onClick={handleHomeClick}
          className={cn(
            'flex flex-col items-center justify-center gap-1 py-1.5 px-3 rounded-2xl transition-all duration-200 min-w-[64px]',
            isHomeActive
              ? 'text-primary bg-primary/10 font-semibold shadow-2xs'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
          )}
        >
          <Home className="w-5 h-5 stroke-[1.8]" />
          <span className="text-[11px] leading-none">Home</span>
        </button>

        {/* History */}
        <button
          type="button"
          onClick={handleHistoryClick}
          className={cn(
            'flex flex-col items-center justify-center gap-1 py-1.5 px-3 rounded-2xl transition-all duration-200 min-w-[64px]',
            isHistoryActive
              ? 'text-primary bg-primary/10 font-semibold shadow-2xs'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
          )}
        >
          <Clock className="w-5 h-5 stroke-[1.8]" />
          <span className="text-[11px] leading-none">History</span>
        </button>

        {/* Create */}
        <button
          type="button"
          onClick={handleCreateClick}
          className={cn(
            'flex flex-col items-center justify-center gap-1 py-1.5 px-3 rounded-2xl transition-all duration-200 min-w-[64px]',
            isCreateActive
              ? 'text-primary bg-primary/10 font-semibold shadow-2xs'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
          )}
        >
          <PenTool className="w-5 h-5 stroke-[1.8]" />
          <span className="text-[11px] leading-none">Create</span>
        </button>

        {/* Profile */}
        <button
          type="button"
          onClick={handleProfileClick}
          className="flex flex-col items-center justify-center gap-1 py-1.5 px-3 rounded-2xl transition-all duration-200 min-w-[64px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          <User className="w-5 h-5 stroke-[1.8]" />
          <span className="text-[11px] leading-none">
            {user ? 'Profile' : 'Sign In'}
          </span>
        </button>
      </div>
    </nav>
  );
};
