'use client';

import React, { useEffect } from 'react';
import { ResizableSidebar } from '../../components/sidebar/ResizableSidebar';
import { ShareModal } from '../../components/share/ShareModal';
import { LimitModal } from '../../components/modals/LimitModal';
import { MobileBottomNav } from '../../components/navigation/MobileBottomNav';
import { useQuota } from '../../hooks/useQuota';
import { useChatStore } from '../../store/chatStore';
import { api } from '../../lib/api';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setUser, setQuota } = useChatStore();
  useQuota(); // Activate live quota polling

  // Check user session & subscription status on load
  useEffect(() => {
    api.getMe().then((res) => {
      if (res && res.authenticated && res.user) {
        setUser(res.user);
      }
    }).catch(() => {});

    api.getSubscriptionStatus().then((sub) => {
      if (sub) {
        setQuota(sub);
      }
    }).catch(() => {});
  }, [setUser, setQuota]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-transparent font-sans">
      <ResizableSidebar />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {children}
      </main>
      <ShareModal />
      <LimitModal />
    </div>
  );
}
