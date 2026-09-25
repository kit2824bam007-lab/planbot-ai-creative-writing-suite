'use client';

import React from 'react';
import Link from 'next/link';
import { User, LogOut, Sparkles, Shield } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { api } from '../../lib/api';
import { toast } from 'sonner';

export const UserMenu: React.FC = () => {
  const { user, setUser, setIsLimitModalOpen } = useChatStore();

  const handleLogout = async () => {
    try {
      await api.logout();
      setUser(null);
      toast.success('Logged out successfully.');
    } catch (e) {
      setUser(null);
    }
  };

  const isPro = user?.plan === 'PRO';

  const expiryDisplay = (() => {
    if (!user?.subscriptionExpiryDate) return null;
    try {
      const d = new Date(user.subscriptionExpiryDate);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (_) {
      return null;
    }
  })();

  if (user) {
    return (
      <div className="p-3 border-t border-[#EAE3DA] dark:border-[#24212D] bg-white/70 dark:bg-[#16141D]/70 backdrop-blur-sm space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold uppercase shrink-0 border border-primary/20">
              {user.name ? user.name[0] : 'U'}
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                  {user.name || user.email}
                </span>
                {isPro && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-primary text-white shadow-2xs">
                    PRO
                  </span>
                )}
              </div>
              <div className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">
                {user.email}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors shrink-0"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Subscription status footer */}
        {isPro ? (
          expiryDisplay && (
            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center justify-between pt-0.5 px-0.5 font-sans">
              <span>Pro member</span>
              <span className="font-mono">Expires {expiryDisplay}</span>
            </div>
          )
        ) : (
          <button
            type="button"
            onClick={() => setIsLimitModalOpen(true)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2.5 text-[11px] font-semibold rounded-xl bg-primary/10 border border-primary/25 text-primary hover:bg-primary/15 transition-all shadow-2xs"
          >
            <Sparkles className="w-3 h-3" />
            <span>Upgrade to Pro — ₹30</span>
          </button>
        )}
      </div>
    );
  }

  // Anonymous Guest state
  return (
    <div className="p-3 border-t border-[#EAE3DA] dark:border-[#24212D] bg-white/70 dark:bg-[#16141D]/70 backdrop-blur-sm">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span className="flex items-center gap-1.5 text-[11px]">
            <Shield className="w-3 h-3 text-amber-500" />
            Guest (10/day)
          </span>
          <button
            type="button"
            onClick={() => setIsLimitModalOpen(true)}
            className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <Sparkles className="w-2.5 h-2.5" />
            Pro ₹30
          </button>
        </div>

        <Link
          href="/login"
          className="flex items-center justify-center gap-2 w-full py-2 px-3 text-xs font-semibold rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 shadow-soft-sm transition-all"
        >
          <User className="w-3.5 h-3.5" />
          <span>Sign in to save history</span>
        </Link>
      </div>
    </div>
  );
};
