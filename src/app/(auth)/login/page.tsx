// path: src/app/(auth)/login/page.tsx
import type { Metadata } from 'next';
import LoginClient from './LoginClient';

export const metadata: Metadata = {
  title: 'Log in — Sleep Hypnosis Catalog',
};

type PageProps = {
  searchParams?: { redirectedFrom?: string };
};

function sanitizeRedirect(path?: string): string {
  if (!path) return '/';
  if (!path.startsWith('/')) return '/';
  return path;
}

export default function LoginPage({ searchParams }: PageProps) {
  const redirectedFrom = sanitizeRedirect(searchParams?.redirectedFrom);

  // Server component: pass sanitized redirect target to client
  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <LoginClient redirectedFrom={redirectedFrom} />
    </main>
  );
}
