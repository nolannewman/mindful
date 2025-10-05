// path: src/app/layout.tsx
'use client';

import './globals.css';
import { useEffect, type ReactNode } from 'react';
import { supabase } from '@/../lib/supabase';

/**
 * Root-level auth bootstrap:
 * - Handles both passwordless magic links (hash fragment: #access_token=...)
 *   and PKCE-based flows (?code=...).
 * - Ensures the session is persisted into Supabase storage.
 * - Cleans sensitive params from the URL after processing.
 *
 * Why this fixes production issues:
 * - In production, redirects may land on "/" or any route that does NOT mount your
 *   login page. If no component eagerly parses the URL, Supabase won't store the
 *   session and your app "looks" unauthenticated.
 * - Putting this at the app shell guarantees we always process the first load
 *   after an auth redirect—no matter which page the user lands on.
 */
function AuthBootstrap() {
  useEffect(() => {
    const url = new URL(window.location.href);

    const hasAccessTokenHash = url.hash.includes('access_token=');
    const hasError = url.searchParams.get('error_description');
    const hasCode = url.searchParams.get('code'); // PKCE / OAuth

    const cleanUrl = () => {
      // Strip tokens & errors from URL after processing
      if (hasAccessTokenHash || hasCode || hasError) {
        url.hash = '';
        url.searchParams.delete('code');
        url.searchParams.delete('state');
        url.searchParams.delete('error_description');
        window.history.replaceState({}, '', url.toString());
      }
    };

    // 1) PKCE code exchange (OAuth or OTP email with code param)
    if (hasCode) {
      // exchangeCodeForSession stores the session and sets the current user
      supabase.auth
        .exchangeCodeForSession(window.location.href)
        .finally(cleanUrl);
      return;
    }

    // 2) Hash-based magic link (e.g., #access_token=...)
    if (hasAccessTokenHash) {
      // With detectSessionInUrl=true, the client will parse the hash lazily on the first auth call.
      // Trigger that path and then clean the URL.
      supabase.auth.getSession().finally(cleanUrl);
      return;
    }

    // 3) Nothing to do; ensure auto-refresh is active
    // (No-op here—options set at client creation)
  }, []);

  return null;
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthBootstrap />
        {children}
      </body>
    </html>
  );
}
