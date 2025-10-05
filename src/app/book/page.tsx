// path: app/book/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import resolveCalendlyUrl from '@/lib/booking';

export const metadata: Metadata = {
  title: 'Book a session',
  description: 'Schedule your session via Calendly.',
};

type SearchParams = { [key: string]: string | string[] | undefined } | undefined;

function firstParam(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

// Treat common junk values from demo links as “no provider”
function sanitizeProviderId(id: string | undefined): string | undefined {
  if (!id) return undefined;
  const lower = id.toLowerCase();
  if (lower === 'null' || lower === 'undefined' || lower === '') return undefined;
  return id;
}

export default async function BookPage({ searchParams }: { searchParams: SearchParams }) {
  const providerId = sanitizeProviderId(firstParam(searchParams?.provider));
  const url = await resolveCalendlyUrl(providerId);

  // Always embed Calendly; blend with dark theme
  const embedUrl =
    url +
    (url.includes('?') ? '&' : '?') +
    'hide_gdpr_banner=1&background_color=0b1020&text_color=ffffff&primary_color=6366f1';

  return (
    <main className="container-page py-8">
      {/* Hero */}
      <section className="rounded-2xl hero-gradient hero-glow px-6 py-8 text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Book a session</h1>
            <p className="mt-2 text-sm text-white/70">
              Pick a time that works for you. Your confirmation and meeting link will arrive via email.
            </p>
            {providerId && (
              <p className="mt-1 text-xs text-white/60">
                Booking for provider ID:&nbsp;<span className="font-mono">{providerId}</span>
              </p>
            )}
          </div>

          <div className="flex gap-2">
            {/* Convenience link (embed is still primary) */}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost"
              aria-label="Open Calendly in a new tab"
              title="Open Calendly in a new tab"
            >
              Open in new tab
            </a>
            <Link href="/providers" className="btn-primary">
              Browse providers
            </Link>
          </div>
        </div>
      </section>

      {/* Embedded Calendly */}
      <section className="mt-6">
        <div className="card overflow-hidden">
          {/* Responsive height: min 760px, else fill viewport minus header space */}
          <div
            className="w-full"
            style={{ height: 'max(760px, calc(100vh - 240px))' }}
          >
            <iframe
              title="Calendly Scheduling"
              src={embedUrl}
              className="h-full w-full"
              loading="lazy"
              allow="clipboard-read; clipboard-write"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>

        <p className="mt-3 text-xs text-gray-600 dark:text-gray-300">
          Sessions are provided by hypnotherapy professionals. Sleep Trance does not provide medical care; for clinical
          concerns, consult a licensed provider.
        </p>

        <noscript>
          <p className="mt-3 text-sm">
            JavaScript is required to embed Calendly. You can{' '}
            <a href={url} target="_blank" rel="noopener noreferrer" className="underline">
              open the booking page in a new tab
            </a>
            .
          </p>
        </noscript>
      </section>
    </main>
  );
}
