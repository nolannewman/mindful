// path: src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

type CookieKV = { name: string; value: string };
type SetCookie = { name: string; value: string; options: CookieOptions };

const PROTECTED_PREFIXES: readonly string[] = ['/dashboard', '/upload'];
const AUTH_PAGES = new Set<string>(['/login', '/sign-in', '/sign-up']);

const isProtected = (pathname: string): boolean =>
  PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export async function middleware(req: NextRequest): Promise<Response> {
  // Mutable response so Supabase can refresh cookies
  const res = NextResponse.next({ request: { headers: req.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll(): CookieKV[] {
          return req.cookies.getAll().map(({ name, value }) => ({ name, value }));
        },
        setAll(cookiesToSet: SetCookie[]): void {
          // forward refreshed cookies onto the response
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, { ...options, sameSite: 'lax' });
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname, search } = req.nextUrl;

  // If authed, keep users off auth pages
  if (user && AUTH_PAGES.has(pathname)) {
    const redirect = NextResponse.redirect(new URL('/dashboard', req.url));
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) redirect.headers.append('set-cookie', setCookie);
    return redirect;
  }

  // If NOT authed and the path is protected → /login
  if (!user && isProtected(pathname)) {
    const url = new URL('/login', req.url);
    url.searchParams.set('redirectedFrom', pathname + (search || ''));
    const redirect = NextResponse.redirect(url);
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) redirect.headers.append('set-cookie', setCookie);
    return redirect;
  }

  // Otherwise continue with any refreshed cookies intact
  return res;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/upload/:path*',
    '/login',
    '/sign-in',
    '/sign-up',
    // DO NOT include '/auth/callback' — it must be free to finish the session
  ],
};
