// path: app/login/page.tsx
'use client';

import { useMemo, useState } from 'react';
import { supabase } from '@/../lib/supabase';

function getSiteOrigin(): string {
  // Prefer explicit env in case you render without window at any point
  const envUrl = (process.env.NEXT_PUBLIC_SITE_URL || '').trim();
  if (envUrl) return envUrl.replace(/\/+$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  // Fallback to empty; we will still use a relative path in worst case.
  return '';
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // ✅ Build the callback dynamically (never hardcode localhost)
  const redirectTo = useMemo(() => {
    const base = getSiteOrigin(); // e.g. https://your-vercel-domain.vercel.app
    const path = '/auth/callback';
    return base ? `${base}${path}` : path; // relative path is fine in browser
  }, []);

  async function signInWithGoogle() {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo, // e.g. https://your-domain/auth/callback (or relative)
        },
      });
      if (error) throw error;
      // Supabase will redirect; nothing else to do here.
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Unable to start Google sign-in');
      setBusy(false);
    }
  }

  async function signInEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });
      if (error) throw error;
      setMsg('Check your email for the sign-in link.');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Unable to send magic link');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-semibold">Log in</h1>
      <p className="mt-2 text-sm text-gray-500">
        Sign in with Google or get a magic link via email.
      </p>

      <div className="mt-8 space-y-6">
        <button
          onClick={signInWithGoogle}
          disabled={busy}
          className="w-full rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {busy ? 'Redirecting…' : 'Continue with Google'}
        </button>

        <form onSubmit={signInEmail} className="space-y-3">
          <label className="block text-sm font-medium">Email</label>
          <input
            type="email"
            className="w-full rounded border px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          <button
            type="submit"
            disabled={busy || !email}
            className="w-full rounded border px-3 py-2"
          >
            {busy ? 'Sending…' : 'Send magic link'}
          </button>
        </form>

        {msg && <div className="text-green-700 text-sm">{msg}</div>}
        {err && (
          <div role="alert" className="text-red-600 text-sm">
            {err}
          </div>
        )}

        <div className="text-xs text-gray-500">
          Callback URL:&nbsp;<code>{redirectTo}</code>
        </div>
      </div>
    </main>
  );
}
