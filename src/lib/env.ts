// path: src/lib/env.ts
/**
 * Centralized environment configuration helper.
 *
 * Uses window.location.origin on the client (live origin),
 * and env/VERCEL_URL on the server (SSR, route handlers).
 */

function computeSiteUrl(): string {
  // Client-side: trust the actual page origin
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  // Server-side: use explicit public env, then Vercel URL, then localhost
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit;

  const vercel = process.env.VERCEL_URL; // server-only
  if (vercel) return `https://${vercel}`;

  return 'http://localhost:3000';
}

export const ENV = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  /**
   * Canonical site URL for redirects/callbacks.
   * - Client: window.origin
   * - Server: NEXT_PUBLIC_SITE_URL || https://${VERCEL_URL} || http://localhost:3000
   */
  AUTH_URL: computeSiteUrl(),
};

// Optional: export helper if you prefer call sites to compute lazily
export const getSiteUrl = computeSiteUrl;
