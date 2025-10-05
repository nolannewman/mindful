// path: src/app/auth/callback/page.tsx
import { Suspense } from 'react';
import CallbackClient from './CallbackClient';

export const dynamic = 'force-dynamic'; // Next 15: don't prerender CSR bailout pages

export default function AuthCallbackPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <Suspense fallback={<p className="text-gray-700">Completing sign-in…</p>}>
        <CallbackClient />
      </Suspense>
    </main>
  );
}
