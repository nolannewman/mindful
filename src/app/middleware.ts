import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Define all routes that require authentication
const PROTECTED_PATHS = ['/dashboard', '/upload'];

/**
 * Middleware: Runs on every request and checks if the user
 * has a valid Supabase session cookie.
 *
 * If the user is not authenticated and the path matches a protected route,
 * they are redirected to `/login` with a `redirectedFrom` param.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip public and static routes
  const isProtected = PROTECTED_PATHS.some((prefix) => pathname.startsWith(prefix));
  if (!isProtected) {
    return NextResponse.next();
  }

  // Create a mutable response for Supabase to refresh cookies
  const res = NextResponse.next();

  // Initialize Supabase SSR client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Retrieve session (will auto-refresh tokens if possible)
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If no session, redirect to /login
  if (!session) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('redirectedFrom', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Authenticated — continue with refreshed cookies if any
  return res;
}

/**
 * Configure which routes run through this middleware.
 * Important: The matcher operates on URL paths (not filesystem segment names).
 */
export const config = {
  matcher: ['/dashboard/:path*', '/upload/:path*'],
};
