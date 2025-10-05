// path: src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Only touch auth gating; do not change other app behavior.
const PROTECTED_PREFIXES = ['/dashboard', '/upload', '/(authed)'];
const AUTH_PAGES = new Set(['/login', '/sign-in', '/sign-up']);

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Normalize accidental segment like /(authed)/dashboard → /dashboard
  if (pathname.startsWith('/(authed)/')) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = pathname.replace('/(authed)', '');
    return NextResponse.redirect(redirectUrl);
  }

  // Create a mutable response we can attach refreshed cookies to
  const res = NextResponse.next({
    request: { headers: req.headers },
  });

  // ⚠️ IMPORTANT: Build Supabase server client (cookie refresh) without touching any localhost-ish site URL.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => req.cookies.get(name)?.value,
        set: (name, value, options) => {
          res.cookies.set({ name, value, ...options });
        },
        remove: (name, options) => {
          // Ensure removal persists in the browser
          res.cookies.set({ name, value: '', ...options, maxAge: 0 });
        },
      },
    }
  );

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
  const isAuthPage = AUTH_PAGES.has(pathname);

  // Try to read/refresh the session (will also propagate any refreshed cookies to `res`)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If authenticated, prevent access to auth pages
  if (user && isAuthPage) {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // If not authenticated, block protected routes and preserve intended destination
  if (isProtected && !user) {
    const redirectedFrom = `${pathname}${search}`;
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirectedFrom', redirectedFrom);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated or public — continue with refreshed cookies if any
  return res;
}

/**
 * Configure which routes run through this middleware.
 * Important: The matcher operates on URL paths (not filesystem segment names).
 */
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/upload/:path*',
    '/(authed)/:path*',
    '/login',
    '/sign-in',
    '/sign-up',
  ],
};
