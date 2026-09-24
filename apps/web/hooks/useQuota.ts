'use client';

import { useEffect, useCallback } from 'react';
import { useChatStore } from '../store/chatStore';
import { api } from '../lib/api';

export function useQuota() {
  const { quota, setQuota, user, setUser } = useChatStore();

  const fetchQuota = useCallback(async () => {
    try {
      const data = await api.getQuota();
      if (data && (typeof data.remaining === 'number' || data.isPro || data.plan)) {
        setQuota(data);
        if (data.isPro && user && (user.plan !== 'PRO' || user.subscriptionStatus !== 'ACTIVE')) {
          setUser({
            ...user,
            plan: 'PRO',
            subscriptionStatus: 'ACTIVE',
            subscriptionStartDate: data.startDate,
            subscriptionExpiryDate: data.expiryDate
          });
        }
      }
    } catch (err) {
      // Silently catch quota fetch errors
    }
  }, [setQuota, user, setUser]);

  useEffect(() => {
    fetchQuota();
    const interval = setInterval(fetchQuota, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, [fetchQuota]);

  return {
    quota,
    refreshQuota: fetchQuota
  };
}
