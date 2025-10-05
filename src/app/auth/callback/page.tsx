// path: src/app/auth/callback/page.tsx
import { Suspense } from 'react';
import CallbackClient from './CallbackClient';

export const dynamic = 'force-dynamic'; // Next 15: don't prerender CSR bailout pages

export default function AuthCallbackPage() {
  return (
    <main className="min-h-[60vh] grid place-items-center p-6">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Signing you in…
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Please wait while we securely complete your session.
        </p>

        <div className="mt-6 card p-6">
          <Suspense
            fallback={
              <p className="text-sm text-gray-500 animate-pulse">
                Completing sign-in…
              </p>
            }
          >
            <CallbackClient />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
