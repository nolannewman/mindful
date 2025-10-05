// path: src/app/layout.tsx
'use client';

import './globals.css';
import { useEffect, type ReactNode } from 'react';
import NavBar from '@/components/NavBar';
import { supabase } from '@/lib/supabase/client';
import OnboardingModal from '@/components/OnboardingModal';

/**
 * Root-level session bootstrap.
 * Ensures Supabase picks up magic link / OAuth redirect tokens,
 * persists the session, and cleans URL parameters or hash.
 */
function AuthBootstrap() {
  useEffect(() => {
    const url = new URL(window.location.href);

    const hasAccessTokenHash = url.hash.includes('access_token=');
    const hasError = url.searchParams.get('error_description');
    const hasCode = url.searchParams.get('code'); // PKCE or email link

    const cleanUrl = () => {
      if (hasAccessTokenHash || hasCode || hasError) {
        url.hash = '';
        url.searchParams.delete('code');
        url.searchParams.delete('state');
        url.searchParams.delete('error_description');
        window.history.replaceState({}, '', url.toString());
      }
    };

    if (hasCode) {
      supabase.auth.exchangeCodeForSession(window.location.href).finally(cleanUrl);
      return;
    }

    if (hasAccessTokenHash) {
      // Trigger Supabase to parse hash and persist session
      supabase.auth.getSession().finally(cleanUrl);
    }
  }, []);

  return null;
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased flex flex-col">
        <AuthBootstrap />

        {/* Accessible skip link */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:shadow"
        >
          Skip to content
        </a>

        {/* Global Nav */}
        <NavBar />

        {/* Post-login onboarding (shows only when needed) */}
        <OnboardingModal />

        {/* Page content */}
        <main id="main" className="flex-1 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </body>
    </html>
  );
}
