// path: src/components/NavBar.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

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
        setAuth({ kind: 'anon' });
      } else if (data.user) {
        setAuth({ kind: 'authed', email: data.user.email ?? null });
      } else {
        setAuth({ kind: 'anon' });
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const user = session?.user;
      setAuth(user ? { kind: 'authed', email: user.email ?? null } : { kind: 'anon' });
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
    <header
      className="border-b border-white/10 bg-black/30 backdrop-blur-md sticky top-0 z-40 text-gray-200"
      data-theme="dark"
    >
      <div className="container-page py-3 flex h-14 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-semibold tracking-tight hover:opacity-90 text-white">
            Sleep Trance
          </Link>

          <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-3">
            <Link
              href="/library"
              className={`px-3 py-2 rounded-lg text-sm hover:bg-white/10 transition ${linkCls(isActive('/library'))}`}
              aria-current={isActive('/library') ? 'page' : undefined}
            >
              Library
            </Link>
            <Link
              href="/providers"
              className={`px-3 py-2 rounded-lg text-sm hover:bg-white/10 transition ${linkCls(isActive('/providers'))}`}
              aria-current={isActive('/providers') ? 'page' : undefined}
            >
              Providers
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {auth.kind === 'loading' && (
            <span className="text-sm text-gray-400" aria-live="polite">
              Checking session…
            </span>
          )}

          {auth.kind === 'anon' && (
            <Link href="/login" className="btn-primary">
              Sign up / Log in
            </Link>
          )}

          {auth.kind === 'authed' && (
            <>
              <Link href="/dashboard" className="btn-ghost">
                Dashboard
              </Link>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await supabase.auth.signOut();
                  router.replace('/login');
                }}
              >
                <button type="submit" className="btn-ghost" aria-label="Sign out">
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
    active ? 'font-semibold text-indigo-300' : 'text-gray-200',
  ].join(' ');
}
