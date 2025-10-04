// path: src/lib/env.ts
/**
 * Centralized environment configuration helper.
 *
 * Automatically detects the base URL for Supabase auth callbacks.
 * - In development, uses http://localhost:3000
 * - In production, uses the deployed Vercel URL or your custom domain.
 */

export const ENV = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  /**
   * Auth URL used for redirectTo and SSR verification.
   * Safe to hardcode per environment automatically.
   */
  AUTH_URL:
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'),
};
