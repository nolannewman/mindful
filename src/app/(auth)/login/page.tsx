// path: src/app/(auth)/login/page.tsx
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';

function safeRedirect(raw: string | null): string {
  if (typeof window === 'undefined') return '/dashboard';
  try {
    const u = new URL(raw || '/dashboard', window.location.origin);
    let path = u.pathname + u.search + u.hash;
    if (!path.startsWith('/')) path = '/' + path;
    if (path === '/' || path.startsWith('/auth') || path.startsWith('/login')) return '/dashboard';
    return path;
  } catch {
    return '/dashboard';
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);

    const sp = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const redirect = safeRedirect(sp?.get('redirect') ?? null);
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    const emailRedirectTo = `${base}/auth/callback?redirect=${encodeURIComponent(redirect)}`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo, shouldCreateUser: true },
    });

    setBusy(false);
    if (error) { setErr(error.message); return; }
    setSent(true);
  };

  return (
    <main className="container-page py-10">
      {/* Hero */}
      <section className="rounded-2xl hero-gradient hero-glow px-6 py-8 mb-6 text-white">
        <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-sm text-white/70">
          Sign in with a magic link—no passwords needed.
        </p>
      </section>

      {/* Card */}
      <section className="card max-w-md mx-auto p-6">
        {!sent ? (
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email
              </label>
              <input
                id="email"
                className="input"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                aria-invalid={!!err || undefined}
                aria-describedby={err ? 'login-error' : undefined}
              />
            </div>

            {err && (
              <p id="login-error" className="text-sm text-red-500" role="alert">
                {err}
              </p>
            )}

            <button
              type="submit"
              disabled={busy || !email}
              className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
              aria-busy={busy}
            >
              {busy ? 'Sending…' : 'Send magic link'}
            </button>

            <p className="text-xs text-gray-500 text-center">
              We’ll email you a one-time link. Open it on this device to finish signing in.
            </p>
          </form>
        ) : (
          <div className="space-y-4" aria-live="polite">
            <h2 className="text-lg font-medium">Check your email</h2>
            <p className="text-sm">
              We sent a sign-in link to <strong>{email}</strong>. Open it on this device to complete login.
            </p>
            <div className="flex items-center justify-between gap-3">
              <button
                className="btn-ghost"
                onClick={() => { setSent(false); setErr(null); }}
              >
                Use a different email
              </button>
              <button
                className="btn-primary"
                onClick={(e) => { e.preventDefault(); setSent(false); }}
              >
                Resend
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Footer nav */}
      <div className="max-w-md mx-auto mt-4">
        <Link href="/" className="btn-ghost">← Back</Link>
      </div>
    </main>
  );
}
