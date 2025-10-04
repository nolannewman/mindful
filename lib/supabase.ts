// path: lib/supabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Avoid crashing the app at import-time if the required public envs
 * are not present. Instead, export a client that throws a clear error
 * message **when used**, allowing pages to render error/empty states.
 *
 * Required by this app:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// One error message used across all traps so users see a clear hint.
const missingEnvMessage =
  '[env] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
  'Set these in .env.local (for local dev) or in Vercel Project Settings → Environment Variables.';

// Only instantiate in the browser when both env vars are present.
// This prevents SSR/build-time initialization from ever happening.
let client: SupabaseClient | null = null;
if (typeof window !== 'undefined' && url && anon) {
  client = createClient(url, anon);
}

// A Proxy that throws the above error on any access/use.
// This prevents crashes at module import time, but guarantees
// a clear error only when someone tries to call the client.
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

/**
 * Optional helper to proactively assert env is present before doing any work.
 * Useful in actions/handlers if you want to fail fast with a clear error.
 */
export function ensureSupabaseEnv(): void {
  if (!url || !anon) throw new Error(missingEnvMessage);
}
