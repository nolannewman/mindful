// path: src/app/auth/callback/CallbackClient.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

function safeRedirect(raw: string | null | undefined): string {
  if (!raw || typeof window === 'undefined') return '/dashboard';
  try {
    const u = new URL(raw, window.location.origin);
    if (u.origin !== window.location.origin) return '/dashboard';
    let path = u.pathname + u.search + u.hash;
    if (!path.startsWith('/')) path = '/' + path;
    if (path === '/' || path.startsWith('/auth') || path.startsWith('/login')) return '/dashboard';
    return path;
  } catch {
    return '/library';
  }
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : typeof e === 'string' ? e : 'Unknown auth error';
}

function parseImplicitHash() {
  if (typeof window === 'undefined') return { access_token: null as string | null, refresh_token: null as string | null };
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  const qp = new URLSearchParams(hash);
  return {
    access_token: qp.get('access_token'),
    refresh_token: qp.get('refresh_token'),
  };
}

export default function CallbackClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const [msg, setMsg] = useState('Finishing sign-in…');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const href = typeof window !== 'undefined' ? window.location.href : '';
      const url = new URL(href);
      const hasCode = !!url.searchParams.get('code');

      let lastErr: unknown = null;

      // 1) Try PKCE if ?code exists
      if (hasCode) {
        try {
          const { error } = await supabase.auth.exchangeCodeForSession(href);
          if (error) lastErr = error;
        } catch (e: unknown) {
          lastErr = e;
        }
      } else {
        // 2) Fallback: implicit flow (#access_token & #refresh_token in hash)
        const { access_token, refresh_token } = parseImplicitHash();
        if (access_token && refresh_token) {
          try {
            const { error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) lastErr = error;
          } catch (e: unknown) {
            lastErr = e;
          }
        }
      }

      // 3) Are we signed in now?
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!session) {
        setMsg(`Auth error: ${errMsg(lastErr)}`);
        return;
      }

      // Clean the URL (remove code/hash) before leaving
      try {
        const keepRedirect = sp.get('redirect');
        const clean = keepRedirect ? `/auth/callback?redirect=${encodeURIComponent(keepRedirect)}` : '/auth/callback';
        window.history.replaceState({}, '', clean);
      } catch { /* ignore */ }

      const to = safeRedirect(sp.get('redirect'));
      router.replace(to);
    })();

    return () => { cancelled = true; };
  }, [router, sp]);

  // --- Styling-only UI shell ---
  const isError = typeof msg === 'string' && msg.startsWith('Auth error');

  return (
    <div className="space-y-4" aria-live="polite">
      <div className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-2 bg-indigo-500 dark:bg-indigo-400 animate-pulse"
          style={{ width: '66%' }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={66}
        />
      </div>
      <p className={`text-sm ${isError ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-200'}`}>
        {msg}
      </p>
    </div>
  );
}
