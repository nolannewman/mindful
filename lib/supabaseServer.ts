// path: src/lib/supabaseServer.ts
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

type CookieKV = { name: string; value: string };
type SetCookie = { name: string; value: string; options: CookieOptions };

export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll(): CookieKV[] {
          return cookieStore.getAll().map(({ name, value }) => ({ name, value }));
        },
        // RSC can’t mutate headers directly; no-op is OK for normal page renders.
        // If you use Route Handlers and need to forward Set-Cookie, copy from the response headers.
        setAll(_cookies: SetCookie[]): void {
          // intentionally no-op; middleware handles refresh and mutations at the edge
        },
      },
    }
  );

  return client;
}
