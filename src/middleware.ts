// path: src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Only touch auth gating; do not change other app behavior.
const PROTECTED_PREFIXES = ['/dashboard', '/upload', '/(authed)'];
const AUTH_PAGES = new Set(['/login', '/sign-in', '/sign-up']);

// Helper: protected path check
const isProtectedPath = (pathname: string) =>
  PROTECTED_PREFIXES.some((p) =>
    p.endsWith('/')
      ? pathname.startsWith(p)
      : pathname === p || pathname.startsWith(p + '/')
  );

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Normalize accidental segment like /(authed)/dashboard → /dashboard
  if (pathname.startsWith('/(authed)/')) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = pathname.replace('/(authed)', '');
    return NextResponse.redirect(redirectUrl);
  }

  const isProtected = isProtectedPath(pathname);
  const isAuthPage = AUTH_PAGES.has(pathname);

  /**
   * ✅ ONE FIX: normalize the host to your canonical domain
   * Why: If users sign in on domain A but hit domain B (preview URL),
   * the Supabase auth cookies won't be present and middleware will
   * think they're logged out. We redirect protected/auth pages to
   * the canonical host from NEXT_PUBLIC_AUTH_URL, preserving path/query.
   */
  const siteUrl = process.env.NEXT_PUBLIC_AUTH_URL; // e.g. https://mindful-n76v.vercel.app
  if (siteUrl && (isProtected || isAuthPage)) {
    try {
      const canonical = new URL(siteUrl);
      const current = new URL(req.url);
      if (canonical.host !== current.host || canonical.protocol !== current.protocol) {
        const to = new URL(req.url);
        to.host = canonical.host;
        to.protocol = canonical.protocol;
        return NextResponse.redirect(to);
      }
    } catch {
      // If env is malformed, skip host normalization.
    }
  }

  // Create a mutable response we can attach refreshed cookies to
  const res = NextResponse.next({
    request: { headers: req.headers },
  });

  // Build Supabase server client (cookie refresh)
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
          res.cookies.set({ name, value: '', ...options, maxAge: 0 });
        },
      },
    }
  );

  // Try to read/refresh the session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If authenticated, prevent access to auth pages (e.g., /login)
  if (user && isAuthPage) {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // If not authenticated, block protected routes and preserve destination
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
    // Ensure we can gate auth pages (so signed-in users can't visit them)
    '/login',
    '/sign-in',
    '/sign-up',
  ],
};
