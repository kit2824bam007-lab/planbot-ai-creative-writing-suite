'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { api } from '../../../lib/api';
import { useChatStore } from '../../../store/chatStore';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useChatStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    try {
      const res = await api.login({ email, password });
      setUser(res.user);
      toast.success('Welcome back!');
      router.push('/');
    } catch (err: any) {
      toast.error(err.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleMock = async () => {
    setLoading(true);
    try {
      const res = await api.googleLogin({
        email: 'user.creative@gmail.com',
        name: 'Creative Poet',
        googleId: 'g_poet_1001'
      });
      setUser(res.user);
      toast.success('Signed in with Google Account!');
      router.push('/');
    } catch (err: any) {
      toast.error(err?.message || 'Google Sign In failed.');
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
            Sign in to DreamInk AI
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-sans">
            Continue composing sublime classical and contemporary poetry.
          </p>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          disabled={loading}
          onClick={handleGoogleMock}
          className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-stone-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-800/80 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-warm-50 dark:hover:bg-zinc-750 transition-all shadow-2xs"
        >
          <svg className="w-4 h-4 shrink-0" width="16" height="16" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="h-[1px] bg-stone-200/80 dark:bg-zinc-800 flex-1" />
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">or with email</span>
          <span className="h-[1px] bg-stone-200/80 dark:bg-zinc-800 flex-1" />
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="poet@example.com"
                className="w-full bg-warm-50/70 dark:bg-zinc-900/60 border border-[#E2DBD1] dark:border-zinc-750 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-zinc-800 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
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
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Sign In</span>}
          </button>
        </form>

        <div className="text-center text-xs text-zinc-500">
          Don't have an account?{' '}
          <Link href="/register" className="text-primary font-semibold hover:underline">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}
