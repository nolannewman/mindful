'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
// If NO tsconfig path alias:
// import { supabase } from '../../../../lib/supabase/client';
import { supabase } from '@/../lib/supabase/client';

export default function AuthedLayout({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState<boolean | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) {
        setOk(true);
      } else {
        setOk(false);
        const redirect = encodeURIComponent(pathname || '/dashboard');
        router.replace(`/login?redirect=${redirect}`);
      }
    })();
    return () => { cancelled = true; };
  }, [pathname, router]);

  if (ok === null) {
    return <div className="p-6">Checking session…</div>;
  }

  return <>{children}</>;
}
