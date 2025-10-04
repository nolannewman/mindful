// path: src/app/auth/callback/CallbackClient.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/../lib/supabase';

type Status = 'working' | 'done' | 'error';

export default function CallbackClient() {
  const router = useRouter();
  const search = useSearchParams();
  const [status, setStatus] = useState<Status>('working');
  const [message, setMessage] = useState('Completing sign-in…');

  const redirectedFrom = useMemo(
    () => search.get('redirectedFrom') || '/dashboard',
    [search]
  );

  useEffect(() => {
    let cancelled = false;

    async function run(): Promise<void> {
      try {
        // 1) Handle magic-link tokens that arrive via URL hash
        const hash = typeof window !== 'undefined' ? window.location.hash : '';
        if (hash && hash.includes('access_token')) {
          const params = new URLSearchParams(hash.slice(1));
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');

          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (error) throw error;

            // Clean the URL (remove sensitive hash)
            window.history.replaceState({}, document.title, '/auth/callback');
            if (!cancelled) {
              setStatus('done');
              router.replace(redirectedFrom);
            }
            return;
          }
        }

        // 2) Handle OAuth / OTP code (?code=...)
        const code = search.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(
            window.location.href
          );
          if (error) throw error;

          // Clean the URL (remove query)
          window.history.replaceState({}, document.title, '/auth/callback');
          if (!cancelled) {
            setStatus('done');
            router.replace(redirectedFrom);
          }
          return;
        }

        // 3) Nothing to process – show a message and send to login
        if (!cancelled) {
          setStatus('error');
          setMessage('No authentication parameters found in the URL.');
          setTimeout(() => router.replace('/login'), 1200);
        }
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unexpected authentication error.';
        console.error('Auth callback error:', err);
        if (!cancelled) {
          setStatus('error');
          setMessage(errorMessage);
          setTimeout(() => router.replace('/login'), 1500);
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router, search, redirectedFrom]);

  return (
    <>
      <h1 className="text-xl font-semibold mb-2">
        {status === 'working'
          ? 'Completing sign-in…'
          : status === 'done'
          ? 'Signed in!'
          : 'Sign-in error'}
      </h1>
      <p className="text-gray-600">
        {status === 'working'
          ? 'Please wait a moment.'
          : status === 'done'
          ? 'Redirecting you now…'
          : message}
      </p>
    </>
  );
}
