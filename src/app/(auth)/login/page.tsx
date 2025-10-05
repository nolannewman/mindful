// path: src/app/login/page.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/../lib/supabase';

/**
 * This version ensures magic-link emails from Supabase always point to
 * the correct domain.
 *
 * - On Vercel (Preview/Production): uses https://${VERCEL_URL}
 * - On localhost: uses http://localhost:3000
 * 
 * Vercel automatically injects process.env.VERCEL_URL at build/deploy time.
 */

function getRedirectUrl(): string {
  // Vercel provides the domain in VERCEL_URL (no protocol)
  const vercel = process.env.VERCEL_URL;
  if (vercel) {
    return `https://${vercel}/`;
  }

  // Local development fallback
  if (typeof window !== 'undefined' && window.location.origin.includes('localhost')) {
    return `${window.location.origin}/`;
  }

  // Safe default
  return 'http://localhost:3000/';
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setError(null);
    setSent(false);
    setSending(true);

    try {
      const redirectTo = getRedirectUrl();

      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });

      if (authError) throw new Error(authError.message);

      setSent(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to send magic link.';
      setError(message);
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="max-w-md mx-auto p-6" aria-labelledby="login-title">
      <h1 id="login-title" className="text-2xl font-semibold">Sign in</h1>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
          disabled={!email || sending}
          className="rounded bg-black text-white px-4 py-2 disabled:opacity-50"
        >
          {sending ? 'Sending…' : 'Send magic link'}
        </button>

        {error && (
          <div role="alert" className="rounded border border-red-300 bg-red-50 text-red-700 p-3 text-sm">
            {error}
          </div>
        )}

        {sent && (
          <div role="status" className="rounded border border-green-300 bg-green-50 text-green-700 p-3 text-sm">
            Check your inbox for a magic link.
          </div>
        )}

        <p className="text-xs text-gray-600 mt-3">
          Redirect base: <code className="font-mono">{getRedirectUrl()}</code>
        </p>
      </form>
    </main>
  );
}
