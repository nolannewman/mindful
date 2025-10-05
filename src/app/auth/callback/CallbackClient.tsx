'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/../lib/supabase/client';

export default function CallbackClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const [msg, setMsg] = useState('Finishing sign-in…');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Works for both code in query and tokens in hash
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (cancelled) return;

        if (error) {
          setMsg(`Auth error: ${error.message}`);
          return;
        }

        const to = sp.get('redirect') || '/dashboard';
        router.replace(to);
      } catch (e: unknown) {
        if (cancelled) return;

        const message =
          e instanceof Error
            ? e.message
            : typeof e === 'string'
            ? e
            : (typeof e === 'object' &&
               e !== null &&
               'message' in e &&
               typeof (e as { message: unknown }).message === 'string')
            ? String((e as { message: unknown }).message)
            : 'Unknown error';

        setMsg(`Auth error: ${message}`);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, sp]);

  return <div className="p-6">{msg}</div>;
}
