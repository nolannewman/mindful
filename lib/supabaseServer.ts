// path: src/lib/supabaseServer.ts
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

type CookieKV = { name: string; value: string };
type SetCookie = { name: string; value: string; options: CookieOptions };

/** SSR Supabase client for server components / route handlers (Next 15). */
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
        // In RSC we don't mutate headers here. Middleware handles refresh writes at the edge.
        setAll(_cookies: SetCookie[]): void {
          // no-op by design (safe for server components)
        },
      },
    }
  );

  return client;
}
