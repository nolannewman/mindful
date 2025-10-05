// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// List the REAL URLs that should require auth:
const PROTECTED_PREFIXES = ['/dashboard', '/upload']; // add more real paths if needed
const AUTH_PAGES = new Set(['/login', '/sign-in', '/sign-up']);

// helper: does a pathname fall under any protected prefix?
const isProtected = (pathname: string) =>
  PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );

export async function middleware(req: NextRequest) {
  // create a mutable response so Supabase can attach refreshed cookies
  const res = NextResponse.next();

  // Use NEXT_PUBLIC_* keys in middleware (Edge) — they’re available and already set
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Edge adapter must use getAll/setAll
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            res.cookies.set(name, value, { ...options, sameSite: 'lax' });
          }
        },
      },
    }
  );

  // This can refresh the session and emit Set-Cookie via setAll above
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = req.nextUrl;

  // If authed, keep users out of /login (etc.)
  if (user && AUTH_PAGES.has(pathname)) {
    const url = new URL('/dashboard', req.url);
    const redirect = NextResponse.redirect(url);
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) redirect.headers.append('set-cookie', setCookie);
    return redirect;
  }

  // If not authed and hitting a protected path → /login?redirectedFrom=...
  if (!user && isProtected(pathname)) {
    const url = new URL('/login', req.url);
    url.searchParams.set('redirectedFrom', pathname + (search || ''));
    const redirect = NextResponse.redirect(url);
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) redirect.headers.append('set-cookie', setCookie);
    return redirect;
  }

  // otherwise continue with any refreshed cookies intact
  return res;
}

export const config = {
  // IMPORTANT: only match real URL paths, not filesystem segments like /(authed)
  matcher: [
    '/dashboard/:path*',
    '/upload/:path*',
    '/login',
    '/sign-in',
    '/sign-up',
  ],
};
