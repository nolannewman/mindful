// path: src/app/login/page.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/../lib/supabase';
import type { JSX } from 'react';

function buildRedirectTo(path: string = '/'): string {
  const base =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3000');

  const cleanBase = base.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

export default function LoginPage(): JSX.Element {
  const [email, setEmail] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<boolean>(false);

  const redirectTo = buildRedirectTo('/auth/callback?redirectedFrom=/dashboard');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setSent(false);
    setSending(true);

    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (authError) throw new Error(authError.message);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send magic link');
    } finally {
      setSending(false);
    }
  }

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
          className="w-full rounded bg-black text-white px-4 py-2 disabled:opacity-50"
        >
          {sending ? 'Sending…' : 'Send magic link'}
        </button>
      </form>

      {error && (
        <div role="alert" className="mt-4 rounded border border-red-300 bg-red-50 text-red-700 p-3 text-sm">
          {error}
        </div>
      )}
      {sent && !error && (
        <div role="status" className="mt-4 rounded border border-green-300 bg-green-50 text-green-700 p-3 text-sm">
          Check your inbox for a magic link.
        </div>
      )}

      <p className="mt-4 text-xs text-gray-600">
        Redirect base:{' '}
        <code className="font-mono">
          {typeof window !== 'undefined'
            ? window.location.origin
            : process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3000'}
        </code>
      </p>
    </main>
  );
}
