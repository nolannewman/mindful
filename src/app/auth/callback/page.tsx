// path: src/app/auth/callback/page.tsx
import { Suspense } from 'react';
import CallbackClient from './CallbackClient';
import type { JSX } from 'react';

export const dynamic = 'force-dynamic';

export default function AuthCallbackPage(): JSX.Element {
  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <Suspense fallback={<p className="text-gray-700">Completing sign-in…</p>}>
        <CallbackClient />
      </Suspense>
    </main>
  );
}
