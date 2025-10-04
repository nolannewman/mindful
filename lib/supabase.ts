// path: lib/supabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Safe Supabase client:
 * - Never initializes at build/SSR without envs.
 * - Initializes in the browser when envs exist.
 * - Otherwise throws a clear error on use (proxy).
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const missingEnvMessage =
  '[env] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
  'Set these in .env.local (dev) or Vercel Project Settings → Environment Variables.';

// Only create the client in the browser when both env vars are present.
let client: SupabaseClient | null = null;
if (typeof window !== 'undefined' && url && anon) {
  client = createClient(url, anon);
}

// Proxy that throws a friendly error if someone tries to use the client without envs.
const throwingProxy = new Proxy(
  function () {},
  {
    get() {
      throw new Error(missingEnvMessage);
    },
    apply() {
      throw new Error(missingEnvMessage);
    },
  },
) as unknown as SupabaseClient;

export const supabase: SupabaseClient = client ?? (throwingProxy as SupabaseClient);

/** Optional helper to proactively check envs before doing work */
export function ensureSupabaseEnv(): void {
  if (!url || !anon) throw new Error(missingEnvMessage);
}
