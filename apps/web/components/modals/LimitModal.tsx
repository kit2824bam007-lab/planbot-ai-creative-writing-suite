'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Check, X, Loader2, ShieldCheck, Zap } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { api } from '../../lib/api';
import { toast } from 'sonner';

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if ((window as any).Razorpay) return resolve(true);

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export const LimitModal: React.FC = () => {
  const { isLimitModalOpen, setIsLimitModalOpen, quota, setQuota, user, setUser } = useChatStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  if (!isLimitModalOpen) return null;

  const handleUpgrade = async () => {
    // Pro requires authentication so 30-day access is tied to the user account
    if (!user) {
      toast.info('Please sign in or create an account to activate your Pro subscription.');
      setIsLimitModalOpen(false);
      router.push('/login');
      return;
    }

    try {
      setIsProcessing(true);

      // 1. Create order on backend
      const orderData = await api.createSubscriptionOrder();

      // 2. Load Razorpay Checkout SDK
      const sdkLoaded = await loadRazorpayScript();

      if (sdkLoaded && (window as any).Razorpay) {
        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: 'PlanBot AI',
          description: '30 Days Pro Subscription — Unlimited AI Generations',
          order_id: orderData.orderId,
          prefill: {
            name: user.name || '',
            email: user.email || ''
          },
          theme: {
            color: '#7c3aed'
          },
          handler: async function (response: any) {
            try {
              // 3. Verify payment signature on backend
              const verifyRes = await api.verifySubscriptionPayment({
                razorpay_order_id: response.razorpay_order_id || orderData.orderId,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              });

              if (verifyRes.success) {
                // Update local user and quota state
                setUser({
                  ...user,
                  plan: 'PRO',
                  subscriptionStatus: 'ACTIVE',
                  subscriptionStartDate: verifyRes.subscription?.startDate,
                  subscriptionExpiryDate: verifyRes.subscription?.expiryDate
                });

                setQuota({
                  limit: null,
                  used: null,
                  remaining: null,
                  resetsAt: null,
                  plan: 'PRO',
                  isPro: true,
                  isAnonymous: false,
                  startDate: verifyRes.subscription?.startDate,
                  expiryDate: verifyRes.subscription?.expiryDate
                });

                setIsLimitModalOpen(false);
                toast.success('🎉 Welcome to Pro! 30 days of unlimited AI creative writing activated.');
              }
            } catch (vErr: any) {
              toast.error(vErr.message || 'Payment verification failed.');
            } finally {
              setIsProcessing(false);
            }
          },
          modal: {
            ondismiss: function () {
              setIsProcessing(false);
            }
          }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', function (resp: any) {
          toast.error(resp.error?.description || 'Payment failed. Please try again.');
          setIsProcessing(false);
        });
        rzp.open();
      } else {
        // Fallback for development/offline test environment
        const simulatedPaymentId = `pay_sim_${Date.now()}`;
        const verifyRes = await api.verifySubscriptionPayment({
          razorpay_order_id: orderData.orderId,
          razorpay_payment_id: simulatedPaymentId,
          razorpay_signature: 'test_verified_sig'
        });

        if (verifyRes.success) {
          setUser({
            ...user,
            plan: 'PRO',
            subscriptionStatus: 'ACTIVE',
            subscriptionStartDate: verifyRes.subscription?.startDate,
            subscriptionExpiryDate: verifyRes.subscription?.expiryDate
          });

          setQuota({
            limit: null,
            used: null,
            remaining: null,
            resetsAt: null,
            plan: 'PRO',
            isPro: true,
            isAnonymous: false,
            startDate: verifyRes.subscription?.startDate,
            expiryDate: verifyRes.subscription?.expiryDate
          });

          setIsLimitModalOpen(false);
          toast.success('🎉 Welcome to Pro! 30 days of unlimited AI creative writing activated.');
        }
      }
    } catch (err: any) {
      console.error('Subscription purchase error:', err);
      toast.error(err.message || 'Failed to initialize subscription. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const proFeatures = [
    '30 days access',
    'Unlimited AI generations*',
    'Poem generation',
    'Story generation',
    'Content Creator tools',
    'Continue / Regenerate',
    'More Creative / Emotional / Humorous',
    'All available writing features'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-7 text-center space-y-5">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => setIsLimitModalOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Pro Icon Badge */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-purple-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-purple-500/25">
          <Zap className="w-8 h-8 fill-current text-white" />
        </div>

        {/* Title & Usage Context */}
        <div className="space-y-1.5">
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
            You've reached today's free limit
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
            You've used all {quota?.limit || 10} free generations for today.
          </p>
        </div>

        {/* Upgrade Plan Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 text-left space-y-3.5">
          <div className="flex items-center justify-between border-b border-zinc-200/80 dark:border-zinc-700/60 pb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                PRO PLAN
              </span>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Upgrade to Pro
              </h3>
            </div>
            <div className="text-right">
              <span className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50">
                ₹30
              </span>
              <span className="text-xs text-zinc-400 block font-normal">
                / 30 days
              </span>
            </div>
          </div>

          {/* Checklist */}
          <ul className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
            {proFeatures.map((feat, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span>{feat}</span>
              </li>
            ))}
          </ul>

          <div className="pt-1 text-[11px] text-zinc-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>Secure payment via Razorpay • 100% money-back guarantee</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleUpgrade}
            className="w-full flex items-center justify-center gap-2 py-3 px-5 text-sm font-semibold rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-purple-500/25 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Connecting to payment...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Upgrade to Pro — ₹30</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsLimitModalOpen(false)}
            className="w-full py-2 text-xs font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
};
