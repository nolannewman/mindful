// path: src/app/debug-auth/page.tsx
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { JSX } from 'react';

type CookieKV = { name: string; value: string };

export default async function DebugAuth(): Promise<JSX.Element> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll(): CookieKV[] {
          return cookieStore.getAll().map(({ name, value }) => ({ name, value }));
        },
        setAll(_cookies: { name: string; value: string; options: CookieOptions }[]): void {
          // no-op for debug
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  const names = cookieStore.getAll().map((c) => c.name);

  return (
    <pre className="p-4 text-sm">
      {JSON.stringify({ user, error, cookieNames: names }, null, 2)}
    </pre>
  );
}
