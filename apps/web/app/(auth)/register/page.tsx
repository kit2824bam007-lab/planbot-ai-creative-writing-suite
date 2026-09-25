'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, Mail, Lock, User, Loader2 } from 'lucide-react';
import { api } from '../../../lib/api';
import { useChatStore } from '../../../store/chatStore';
import { toast } from 'sonner';

export default function RegisterPage() {
  const router = useRouter();
  const { setUser } = useChatStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);

  // Common disposable and dummy domains for instant client-side feedback
  const DISPOSABLE_CLIENT_DOMAINS = new Set([
    'mailinator.com', 'tempmail.com', 'temp-mail.org', '10minutemail.com',
    'guerrillamail.com', 'sharklasers.com', 'yopmail.com', 'trashmail.com',
    'dispostable.com', 'getairmail.com', 'fakemail.net', 'burnermail.io',
    'mohmal.com', 'crazymailing.com', 'throwawaymail.com', 'fake.com',
    'test.com', 'example.com', 'sample.com', 'xyz.com', 'abc.com'
  ]);

  const handleEmailChange = (val: string) => {
    setEmail(val);
    setEmailError('');
    const clean = val.trim().toLowerCase();
    if (clean.includes('@')) {
      const domain = clean.split('@')[1];
      if (domain && DISPOSABLE_CLIENT_DOMAINS.has(domain)) {
        setEmailError('Invalid email ID. Fake or disposable email addresses are not allowed.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    const cleanEmail = email.trim().toLowerCase();
    const domain = cleanEmail.split('@')[1];
    if (domain && DISPOSABLE_CLIENT_DOMAINS.has(domain)) {
      setEmailError('Invalid email ID. Fake or disposable email addresses are not allowed.');
      toast.error('Invalid email ID. Fake or disposable email addresses are not allowed.');
      return;
    }

    setLoading(true);
    setEmailError('');
    try {
      const res = await api.register({ email: cleanEmail, password, name });
      setUser(res.user);
      toast.success('Account created successfully!');
      router.push('/');
    } catch (err: any) {
      const msg = err.message || 'Registration failed.';
      if (msg.toLowerCase().includes('email') || msg.toLowerCase().includes('invalid')) {
        setEmailError(msg);
      }
      toast.error(msg);
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
              alt="PlanBot"
              width={40}
              height={40}
              className="w-full h-full max-w-[40px] max-h-[40px] object-contain"
            />
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-medium text-zinc-900 dark:text-zinc-50 tracking-tight">
            Create an Account
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-sans">
            Sign up to save history, access all meters, and share social cards.
          </p>
        </div>

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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
              <Mail className={`w-4 h-4 ${emailError ? 'text-red-400' : 'text-zinc-400'} absolute left-3 top-1/2 -translate-y-1/2`} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="yourname@gmail.com"
                className={`w-full bg-warm-50/70 dark:bg-zinc-900/60 border ${
                  emailError
                    ? 'border-red-500 focus:ring-red-400/20 focus:border-red-500'
                    : 'border-[#E2DBD1] dark:border-zinc-750 focus:ring-primary/20 focus:border-primary'
                } rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-zinc-800 dark:text-zinc-200 outline-none focus:ring-2 transition-all`}
              />
            </div>
            {emailError ? (
              <p className="text-[11px] text-red-500 font-medium mt-1 animate-fade-in">
                {emailError}
              </p>
            ) : (
              <p className="text-[10px] text-zinc-400 mt-0.5">
                Use your real email (e.g. Gmail, Outlook, Yahoo, or your official email).
              </p>
            )}
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
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white rounded-xl shadow-soft-sm bg-[#6B5488] hover:bg-[#5E477A] active:scale-[0.98] transition-all"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Create Account</span>}
          </button>
        </form>

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
