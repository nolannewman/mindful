// path: src/components/NavBar.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/../lib/supabase';

type AuthState =
  | { kind: 'loading' }
  | { kind: 'anon' }
  | { kind: 'authed'; email: string | null };

export default function NavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [auth, setAuth] = useState<AuthState>({ kind: 'loading' });

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;

      if (error) {
        setAuth({ kind: 'anon' }); // fall back safely
      } else if (data.user) {
        setAuth({ kind: 'authed', email: data.user.email ?? null });
      } else {
        setAuth({ kind: 'anon' });
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const user = session?.user;
      if (user) {
        setAuth({ kind: 'authed', email: user.email ?? null });
      } else {
        setAuth({ kind: 'anon' });
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold">
            Sleep Trance
          </Link>

          <nav aria-label="Primary" className="flex items-center gap-4">
            <Link
              href="/library"
              className={linkCls(isActive('/library'))}
              aria-current={isActive('/library') ? 'page' : undefined}
            >
              Library
            </Link>
            <Link
              href="/providers"
              className={linkCls(isActive('/providers'))}
              aria-current={isActive('/providers') ? 'page' : undefined}
            >
              Providers
            </Link>
            {/* Demo → Dashboard (clean URL; not the file tree segment) */}
            <Link
              href="/dashboard"
              className={linkCls(isActive('/dashboard'))}
              aria-current={isActive('/dashboard') ? 'page' : undefined}
            >
              Demo
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {auth.kind === 'loading' && (
            <span className="text-sm text-gray-500" aria-live="polite">
              Checking session…
            </span>
          )}

          {auth.kind === 'anon' && (
            <Link
              href="/login"
              className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Sign up / Log in
            </Link>
          )}

          {auth.kind === 'authed' && (
            <>
              <Link
                href="/dashboard"
                className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                Dashboard
              </Link>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await supabase.auth.signOut();
                  router.replace('/login');
                }}
              >
                <button
                  type="submit"
                  className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
                  aria-label="Sign out"
                >
                  Sign out
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function linkCls(active: boolean) {
  return [
    'text-sm',
    'hover:underline',
    active ? 'font-medium underline' : 'text-gray-700',
  ].join(' ');
}
