// path: app/auth/callback/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/../lib/supabase';

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<'working' | 'ok' | 'error'>('working');
  const [message, setMessage] = useState('Finishing sign-in…');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        // Exchanges the code in the URL for a session (PKCE)
        const { error } = await supabase.auth.exchangeCodeForSession(
          typeof window !== 'undefined' ? window.location.href : ''
        );
        if (error) throw error;
        if (!active) return;
        setStatus('ok');
        setMessage('Signed in! You can continue.');
      } catch (e: unknown) {
        if (!active) return;
        setStatus('error');
        setMessage(e instanceof Error ? e.message : 'Could not complete sign-in.');
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // ✅ Only use relative paths here — never absolute localhost.
  const nextHref = '/dashboard';

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-semibold">Auth Callback</h1>
      <p className="mt-2">{message}</p>
      <div className="mt-6">
        {status === 'ok' ? (
          <Link href={nextHref} className="underline">
            Continue to Dashboard →
          </Link>
        ) : status === 'error' ? (
          <Link href="/login" className="underline">
            Return to login →
          </Link>
        ) : null}
      </div>
    </main>
  );
}
