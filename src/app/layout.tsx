// path: src/app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import { ReactNode } from 'react';
import NavBar from '@/../components/NavBar'; // Re-added global navigation bar

export const metadata: Metadata = {
  title: 'Sleep Hypnosis Catalog',
  description: 'Explore sleep hypnosis content and book sessions with providers.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col">
        {/* Accessible skip link */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:shadow"
        >
          Skip to content
        </a>

        {/* Global Nav (appears on every page) */}
        <NavBar />

        {/* Main content */}
        <main id="main" className="flex-1">
          {children}
        </main>
      </body>
    </html>
  );
}
