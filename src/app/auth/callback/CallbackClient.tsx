// path: src/app/auth/callback/CallbackClient.tsx
'use client';
import type { JSX } from 'react';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/../lib/supabase';

type Status = 'working' | 'done' | 'error';

function sanitizeRedirect(path: string | null): string {
  if (!path || !path.startsWith('/')) return '/dashboard';
  return path;
}

export default function CallbackClient(): JSX.Element {
  const router = useRouter();
  const sp = useSearchParams();
  const [status, setStatus] = useState<Status>('working');
  const [message, setMessage] = useState<string>('Completing sign-in…');

  const redirectedFrom = useMemo<string>(() => {
    const a = sp.get('redirectedFrom');
    const b = sp.get('next');
    return sanitizeRedirect(a ?? b);
  }, [sp]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // 0) Provider error passthrough (?error=...&error_description=...)
        const oauthErr = sp.get('error');
        const oauthDesc = sp.get('error_description') ?? sp.get('error_description[]');
        if (oauthErr) {
          if (!cancelled) {
            setStatus('error');
            setMessage(decodeURIComponent(oauthDesc ?? oauthErr));
            setTimeout(() => router.replace('/login'), 1200);
          }
          return;
        }

        // 1) Hash-based tokens (rare, but some providers use them)
        const hash = typeof window !== 'undefined' ? window.location.hash : '';
        if (hash.includes('access_token')) {
          const params = new URLSearchParams(hash.slice(1));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) throw error;

            // Clean hash to avoid re-processing
            window.history.replaceState({}, document.title, '/auth/callback');

            if (!cancelled) {
              setStatus('done');
              router.replace(redirectedFrom);
            }
            return;
          }
        }

        // 2) PKCE / OTP code (?code=...)
        const code = sp.get('code');
        if (code) {
          const href = typeof window !== 'undefined' ? window.location.href : '';
          const { error } = await supabase.auth.exchangeCodeForSession(href);
          if (error) throw error;

          // Clean query to avoid re-processing on back/refresh
          window.history.replaceState({}, document.title, '/auth/callback');

          if (!cancelled) {
            setStatus('done');
            router.replace(redirectedFrom);
          }
          return;
        }

        // 3) No auth params → exit gracefully
        if (!cancelled) {
          setStatus('error');
          setMessage('No authentication parameters found.');
          setTimeout(() => router.replace('/login'), 900);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unexpected authentication error.';
        if (!cancelled) {
          setStatus('error');
          setMessage(msg);
          setTimeout(() => router.replace('/login'), 1000);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [router, sp, redirectedFrom]);

  return (
    <>
      <h1 className="text-2xl font-semibold">
        {status === 'working' ? 'Auth Callback' : status === 'done' ? 'Signed in!' : 'Sign-in error'}
      </h1>
      <p className="mt-2 text-gray-700">
        {status === 'working'
          ? 'Completing sign-in…'
          : status === 'done'
          ? 'Redirecting you now…'
          : message}
      </p>
    </>
  );
}
