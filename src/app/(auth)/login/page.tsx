// path: src/app/(auth)/login/page.tsx
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/../lib/supabase';

/**
 * Build an ABSOLUTE redirect URL for Supabase emails / OAuth.
 * - On Vercel: uses https://${process.env.VERCEL_URL}
 * - Else (dev): uses window.location.origin (localhost)
 * Always returns an absolute URL with a path suffix.
 */
function buildRedirectTo(path: string): string {
  const vercel = process.env.VERCEL_URL;
  const base = vercel
    ? `https://${vercel}` // Vercel gives bare domain without protocol
    : (typeof window !== 'undefined' && window.location?.origin)
      ? window.location.origin
      : 'http://localhost:3000';
  const cleanBase = base.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Always absolute; never relative.
  const redirectTo = useMemo(() => buildRedirectTo('/auth/callback'), []);

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setErr(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw new Error(error.message);
      setMsg('Check your inbox for a sign-in link.');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unable to send magic link';
      setErr(message);
    } finally {
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      if (error) throw new Error(error.message);
      // Supabase will redirect to the provider; nothing to do here.
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unable to start Google sign-in';
      setErr(message);
      setBusy(false);
    }
  }

  return (
    <main className="max-w-md mx-auto p-6" aria-labelledby="login-title">
      <h1 id="login-title" className="text-2xl font-semibold">Sign in</h1>

      <form onSubmit={signInWithEmail} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 block w-full rounded border p-2"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </label>

        <button
          type="submit"
          disabled={!email || busy}
          className="w-full rounded bg-black text-white px-4 py-2 disabled:opacity-50"
        >
          {busy ? 'Sending…' : 'Send magic link'}
        </button>
      </form>

      <div className="mt-6">
        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={busy}
          className="w-full rounded border px-4 py-2 disabled:opacity-50"
        >
          Continue with Google
        </button>
      </div>

      {msg && (
        <div role="status" className="mt-4 rounded border border-green-300 bg-green-50 text-green-700 p-3 text-sm">
          {msg}
        </div>
      )}
      {err && (
        <div role="alert" className="mt-4 rounded border border-red-300 bg-red-50 text-red-700 p-3 text-sm">
          {err}
        </div>
      )}

      <p className="mt-4 text-xs text-gray-600">
        Redirect: <code className="font-mono">{redirectTo}</code>
      </p>
      <p className="mt-1 text-xs text-gray-600">
        Ensure this URL is added in Supabase → Authentication → Redirect URLs.
      </p>
    </main>
  );
}
