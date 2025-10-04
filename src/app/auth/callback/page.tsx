// path: src/app/auth/callback/page.tsx
import { Suspense } from 'react';
import CallbackClient from './CallbackClient';

export default function AuthCallbackPage() {
  // Server component wrapper to satisfy Next.js requirement:
  // useSearchParams() must be used within a Suspense boundary.
  return (
    <main className="mx-auto max-w-lg px-4 py-20 text-center">
      <Suspense
        fallback={
          <>
            <h1 className="text-xl font-semibold mb-2">Completing sign-in…</h1>
            <p className="text-gray-600">Please wait a moment.</p>
          </>
        }
      >
        <CallbackClient />
      </Suspense>
    </main>
  );
}
