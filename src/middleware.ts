// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// REAL URL prefixes that require auth (not folder names)
const PROTECTED_PREFIXES = ['/dashboard', '/upload'];
const AUTH_PAGES = new Set(['/login', '/sign-in', '/sign-up']);

const isProtected = (pathname: string) =>
  PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );

export async function middleware(req: NextRequest) {
  // Create a mutable response so Supabase can attach refreshed cookies
  const res = NextResponse.next({ request: { headers: req.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Edge adapter MUST use getAll / setAll
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookies) {
          for (const { name, value, options } of cookies) {
            res.cookies.set(name, value, { ...options, sameSite: 'lax' });
          }
        },
      },
    }
  );

  // This can refresh the session and emit Set-Cookie via setAll above
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname, search } = req.nextUrl;

  // Keep signed-in users out of login pages
  if (user && AUTH_PAGES.has(pathname)) {
    const url = new URL('/dashboard', req.url);
    const redirect = NextResponse.redirect(url);
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) redirect.headers.append('set-cookie', setCookie);
    return redirect;
  }

  // Gate protected routes
  if (!user && isProtected(pathname)) {
    const url = new URL('/login', req.url);
    url.searchParams.set('redirectedFrom', pathname + (search || ''));
    const redirect = NextResponse.redirect(url);
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) redirect.headers.append('set-cookie', setCookie);
    return redirect;
  }

  // Continue; any refreshed cookies stay on `res`
  return res;
}

export const config = {
  // IMPORTANT: match only REAL URL paths (no /(authed) — that's a folder name)
  matcher: [
    '/dashboard/:path*',
    '/upload/:path*',
    '/login',
    '/sign-in',
    '/sign-up',
  ],
};
