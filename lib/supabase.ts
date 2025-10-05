// path: src/lib/supabase.ts
// Single browser client configured to reliably capture sessions from URL.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  // Fail fast in dev; in prod this would otherwise silently break auth.
  // eslint-disable-next-line no-console
  console.warn('[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or ANON_KEY');
}

export const supbaseAuthOptions = {
  persistSession: true,
  autoRefreshToken: true,
  // Critical: tells the client to look at the current URL on load
  // and extract tokens from either the fragment (#access_token=...)
  // or the PKCE code flow (?code=...).
  detectSessionInUrl: true,
  // Do NOT change storageKey between deployments; keep default naming
  // to avoid "lost" sessions across builds/domains.
} as const;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: supbaseAuthOptions,
});
