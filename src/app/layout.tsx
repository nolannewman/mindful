// path: src/app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import { ReactNode } from 'react';
import NavBar from '@/../components/NavBar'; // Global navigation bar

export const metadata: Metadata = {
  title: 'Sleep Hypnosis Catalog',
  description: 'Explore sleep hypnosis content and book sessions with providers.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased flex flex-col">
        {/* Accessible skip link */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:shadow"
        >
          Skip to content
        </a>

        {/* Global Nav (appears on every page) */}
        <NavBar />

        {/* Main content (readable width + responsive padding) */}
        <main id="main" className="flex-1 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </body>
    </html>
  );
}
