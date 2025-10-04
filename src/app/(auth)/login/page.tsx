// path: app/(auth)/login/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/../lib/supabase';
import { ensureProfile } from '@/../lib/auth';

type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent'; email: string }
  | { kind: 'error'; message: string };

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  useEffect(() => {
    // When a session appears, ensure profile then route to dashboard.
    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user;
      if (!user) return;

      const ensured = await ensureProfile({ id: user.id, email: user.email });
      if (!ensured.ok) {
        setStatus({ kind: 'error', message: ensured.error });
        return;
      }
      // Route to dashboard. App Router segment path is the URL path.
      router.replace('/(authed)/dashboard');
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, [router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setStatus({ kind: 'error', message: 'Please enter your email address.' });
      return;
    }
    setStatus({ kind: 'sending' });

    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/(authed)/dashboard`
        : undefined;

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: redirectTo,
        // Only user accounts sign up here; providers are seeded separately.
        shouldCreateUser: true,
      },
    });

    if (error) {
      let msg = error.message || 'Something went wrong sending the magic link.';
      if (msg.toLowerCase().includes('rate')) {
        msg = 'Too many attempts. Please try again in a minute.';
      }
      setStatus({ kind: 'error', message: msg });
      return;
    }

    setStatus({ kind: 'sent', email: trimmed });
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-semibold mb-6">Sign in with a magic link</h1>

      <form onSubmit={handleSubmit} className="space-y-4" aria-describedby="status-message">
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
            placeholder="you@example.com"
            aria-invalid={status.kind === 'error' ? true : undefined}
          />
        </div>

        <button
          type="submit"
          disabled={status.kind === 'sending'}
          className="w-full rounded px-4 py-2 border"
        >
          {status.kind === 'sending' ? 'Sending…' : 'Send magic link'}
        </button>
      </form>

      <div id="status-message" className="mt-4 text-sm" aria-live="polite" role="status">
        {status.kind === 'sent' && (
          <p>
            Check <span className="font-medium">{status.email}</span> for your magic link.
          </p>
        )}
        {status.kind === 'error' && <p className="text-red-600">{status.message}</p>}
      </div>

      <p className="mt-8 text-xs text-gray-500">
        Note: Only user accounts can sign up here. Provider accounts will be seeded by admins.
      </p>
    </main>
  );
}
