'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles, Mail, Lock, User, Loader2, KeyRound, ArrowLeft, RotateCw } from 'lucide-react';
import { api } from '../../../lib/api';
import { useChatStore } from '../../../store/chatStore';
import { toast } from 'sonner';
import { showAuthErrorToast, showAuthSuccessToast } from '../../../lib/authToast';

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useChatStore();

  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // If redirected with ?verify=email, start directly on verification step
  useEffect(() => {
    const verifyEmail = searchParams.get('verify');
    if (verifyEmail && verifyEmail.includes('@')) {
      setEmail(verifyEmail);
      setStep('verify');
    }
  }, [searchParams]);

  // Resend cooldown timer countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const DISPOSABLE_DOMAINS = new Set([
    'mailinator.com', 'tempmail.com', 'temp-mail.org', '10minutemail.com',
    'guerrillamail.com', 'sharklasers.com', 'yopmail.com', 'trashmail.com',
    'dispostable.com', 'getairmail.com', 'fakemail.net', 'burnermail.io',
    'mohmal.com', 'crazymailing.com', 'throwawaymail.com', 'fake.com',
    'test.com', 'example.com', 'sample.com', 'xyz.com', 'abc.com'
  ]);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      showAuthErrorToast('INVALID_EMAIL');
      return;
    }

    const domain = cleanEmail.split('@')[1];
    if (domain && DISPOSABLE_DOMAINS.has(domain)) {
      showAuthErrorToast('DISPOSABLE_EMAIL');
      return;
    }

    if (password.length < 6) {
      showAuthErrorToast('PASSWORD_TOO_SHORT');
      return;
    }

    setLoading(true);
    try {
      const res = await api.register({ email: cleanEmail, password, name });
      if (res?.requiresVerification) {
        setStep('verify');
        setCooldown(60);
        toast.info('Verification code sent! Please check your email inbox.', { duration: 5000 });
      } else if (res?.token) {
        localStorage.setItem('planbot_token', res.token);
        setUser(res.user);
        showAuthSuccessToast('signup');
        router.push('/');
      }
    } catch (err: any) {
      showAuthErrorToast(err, 'Registration could not be completed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      toast.error('Please enter the 6-digit verification code.', { duration: 3500 });
      return;
    }

    setLoading(true);
    try {
      const res = await api.verifyOtp({ email: email.trim().toLowerCase(), otp: cleanOtp });
      if (res?.token) {
        localStorage.setItem('planbot_token', res.token);
      }
      if (res?.user) {
        setUser(res.user);
      }
      showAuthSuccessToast('verification');
      router.push('/');
    } catch (err: any) {
      showAuthErrorToast(err, 'Verification failed. Please check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0 || loading) return;

    setLoading(true);
    try {
      await api.resendOtp({ email: email.trim().toLowerCase() });
      setCooldown(60);
      toast.success('A fresh verification code has been sent to your email.', { duration: 4000 });
    } catch (err: any) {
      showAuthErrorToast(err, 'Unable to resend code right now. Please try again shortly.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-transparent select-none">
      <div className="w-full max-w-md bg-white/92 dark:bg-[#181622]/90 backdrop-blur-md border border-[#E8E2D9] dark:border-[#282534] rounded-3xl shadow-soft-xl p-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-white dark:bg-white/95 p-2 mx-auto border border-stone-200/60 dark:border-white/20 shadow-soft-sm flex items-center justify-center">
            <img
              src="/logo-transparent.png"
              alt="DreamInk"
              width={40}
              height={40}
              className="w-full h-full max-w-[40px] max-h-[40px] object-contain"
            />
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-medium text-zinc-900 dark:text-zinc-50 tracking-tight">
            {step === 'verify' ? 'Verify Your Email' : 'Create an Account'}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-sans">
            {step === 'verify' ? (
              <span>
                We sent a 6-digit code to <strong className="text-zinc-700 dark:text-zinc-200">{email}</strong>.
              </span>
            ) : (
              'Sign up to compose sublime poetry, save chat history, and customize styles.'
            )}
          </p>
        </div>

        {/* Step 1: Registration Form */}
        {step === 'form' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Bharathiyar"
                  className="w-full bg-warm-50/70 dark:bg-zinc-900/60 border border-[#E2DBD1] dark:border-zinc-750 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-zinc-800 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 flex justify-between">
                <span>Email Address</span>
                <span className="text-[10px] text-zinc-400 font-normal">Original email required</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className="w-full bg-warm-50/70 dark:bg-zinc-900/60 border border-[#E2DBD1] dark:border-zinc-750 focus:ring-primary/20 focus:border-primary rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-zinc-800 dark:text-zinc-200 outline-none focus:ring-2 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Password (min. 6 characters)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-warm-50/70 dark:bg-zinc-900/60 border border-[#E2DBD1] dark:border-zinc-750 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-zinc-800 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white rounded-xl shadow-soft-sm bg-[#6B5488] hover:bg-[#5E477A] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Continue with Verification</span>}
            </button>
          </form>
        )}

        {/* Step 2: OTP Verification View */}
        {step === 'verify' && (
          <form onSubmit={handleVerifySubmit} className="space-y-4 animate-fade-in">
            <div className="space-y-1.5 text-center">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                6-Digit Verification Code
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="••••••"
                  className="w-full bg-warm-50/70 dark:bg-zinc-900/60 border border-[#E2DBD1] dark:border-zinc-750 rounded-xl pl-10 pr-4 py-3 text-center text-xl font-bold tracking-[0.4em] font-mono text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Code expires in 15 minutes.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white rounded-xl shadow-soft-sm bg-[#6B5488] hover:bg-[#5E477A] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Verify & Activate Account</span>}
            </button>

            {/* Resend and back controls */}
            <div className="flex items-center justify-between pt-2 text-xs">
              <button
                type="button"
                onClick={() => setStep('form')}
                className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Edit details</span>
              </button>

              <button
                type="button"
                disabled={cooldown > 0 || loading}
                onClick={handleResendOtp}
                className="inline-flex items-center gap-1 font-semibold text-primary hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
              >
                <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}</span>
              </button>
            </div>
          </form>
        )}

        <div className="text-center text-xs text-zinc-500">
          Already have an account?{' '}
          <Link href="/login" className="text-primary font-semibold hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0d0d12]">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
