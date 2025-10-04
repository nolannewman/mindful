// path: app/(public)/page.tsx
'use client';

import Link from 'next/link';

export default function DevLandingPage() {
  const sections = [
    {
      title: 'Public',
      links: [
        { href: '/(public)/page', label: 'Landing (this page)' },
        { href: '/(public)/library', label: 'Library (moved)' },
        { href: '/login', label: 'Login (Magic Link)' },
        { href: '/book', label: 'Book (Calendly placeholder)' },
        { href: '/watch/demo-id', label: 'Watch (Example)' },
      ],
    },
    {
      title: 'Authenticated',
      links: [
        { href: '/(authed)/dashboard', label: 'Dashboard' },
        { href: '/(authed)/upload', label: 'Upload' },
      ],
    },
    {
      title: 'Providers (seeded/future)',
      links: [
        { href: '/providers', label: 'Provider List (future)' },
      ],
    },
  ];

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold mb-8">🧭 Dev Landing Page</h1>
      <p className="text-gray-600 mb-10">
        Quick navigation hub for developers — links to all main routes.
      </p>

      <div className="space-y-8">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-xl font-semibold mb-3">{section.title}</h2>
            <ul className="space-y-2">
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-blue-600 underline hover:text-blue-800"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <footer className="mt-12 text-xs text-gray-500">
        <p>
          ⚙️ <strong>Environment:</strong> Dev-only — remove or replace this page before production.
        </p>
      </footer>
    </main>
  );
}
