// path: src/app/debug-auth/page.tsx
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export default async function DebugAuth() {
  // Next 15: cookies() is async
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // @supabase/ssr expects [{ name, value }, ...]
          return cookieStore
            .getAll()
            .map(({ name, value }) => ({ name, value }));
        },
        // We don't need to write cookies on this debug page
        setAll() {},
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();

  return (
    <pre className="p-4 text-sm">
      {JSON.stringify(
        {
          user,
          error,
          cookieNames: cookieStore.getAll().map((c) => c.name),
        },
        null,
        2
      )}
    </pre>
  );
}
