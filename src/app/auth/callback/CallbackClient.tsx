// path: src/app/auth/callback/CallbackClient.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/../lib/supabase';

type Status = 'working' | 'done' | 'error';

function sanitizeRedirect(path: string | null | undefined): string {
  if (!path || !path.startsWith('/')) return '/dashboard';
  return path;
}

export default function CallbackClient() {
  const router = useRouter();
  const search = useSearchParams();
  const [status, setStatus] = useState<Status>('working');
  const [message, setMessage] = useState('Completing sign-in…');

  const redirectedFrom = useMemo(
    () => sanitizeRedirect(search.get('redirectedFrom')),
    [search]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Provider error passthrough (?error=...&error_description=...)
        const oauthErr = search.get('error');
        const oauthDesc =
          search.get('error_description') || search.get('error_description[]');
        if (oauthErr) {
          const msg = decodeURIComponent(oauthDesc ?? oauthErr);
          if (!cancelled) {
            setStatus('error');
            setMessage(msg || 'Authentication failed.');
            setTimeout(() => router.replace('/login'), 1500);
          }
          return;
        }

        // Hash-based tokens (e.g., #access_token=...)
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

            window.history.replaceState({}, document.title, '/auth/callback');

            if (!cancelled) {
              setStatus('done');
              router.replace(redirectedFrom);
            }
            return;
          }
        }

        // PKCE / email-OTP code (?code=...)
        const code = search.get('code');
        if (code) {
          const currentUrl =
            typeof window !== 'undefined' ? window.location.href : undefined;

          const { error } = await supabase.auth.exchangeCodeForSession(
            currentUrl as string
          );
          if (error) throw error;

          // Clean query to avoid reprocessing on back/refresh
          window.history.replaceState({}, document.title, '/auth/callback');

          if (!cancelled) {
            setStatus('done');
            router.replace(redirectedFrom);
          }
          return;
        }

        // No auth params → send to login
        if (!cancelled) {
          setStatus('error');
          setMessage('No authentication parameters found in the URL.');
          setTimeout(() => router.replace('/login'), 1200);
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Unexpected authentication error.';
        if (!cancelled) {
          setStatus('error');
          setMessage(msg);
          setTimeout(() => router.replace('/login'), 1500);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, search, redirectedFrom]);

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
