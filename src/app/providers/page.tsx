// path: src/app/providers/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

/**
 * Types that mirror your SQL view `public.provider_with_topics`
 * (providers joined with aggregated topics as JSON array).
 */

type Topic = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  created_at: string;
};

type ProviderRow = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  calendly_url: string | null;
  rate: string | null; // numeric(10,2) comes back as string
  created_at: string;
  topics: Topic[] | null; // view returns JSON array; can be null
};

type Provider = Omit<ProviderRow, 'topics'> & { topics: Topic[] };

type ViewState =
  | { kind: 'loading' }
  | { kind: 'ready'; providers: Provider[] }
  | { kind: 'error'; message: string };

export default function ProvidersPage() {
  const [state, setState] = useState<ViewState>({ kind: 'loading' });
  const [query, setQuery] = useState('');

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('provider_with_topics')
        .select('*')
        // 👇 Strongly type the expected payload (no `any`)
        .returns<ProviderRow[]>();

      if (error) {
        setState({ kind: 'error', message: error.message });
        return;
      }

      const providers: Provider[] = (data ?? []).map((row) => ({
        ...row,
        topics: Array.isArray(row.topics) ? row.topics : [],
      }));

      setState({ kind: 'ready', providers });
    })();
  }, []);

  const filtered = useMemo(() => {
    if (state.kind !== 'ready') return [];
    const q = query.trim().toLowerCase();
    if (!q) return state.providers;

    return state.providers.filter((p) => {
      const inName =
        p.name?.toLowerCase().includes(q) ||
        p.slug?.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q);

      const inTopics = p.topics.some(
        (t) =>
          t.name?.toLowerCase().includes(q) ||
          t.slug?.toLowerCase().includes(q) ||
          (t.description ?? '').toLowerCase().includes(q)
      );

      return inName || inTopics;
    });
  }, [state, query]);

  if (state.kind === 'loading') {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="mb-4 text-2xl font-semibold">Providers</h1>
        <p>Loading providers…</p>
      </main>
    );
  }

  if (state.kind === 'error') {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="mb-4 text-2xl font-semibold">Providers</h1>
        <p className="text-red-600">Error: {state.message}</p>
      </main>
    );
  }

  // ready
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Providers</h1>
          <p className="text-sm text-gray-600">
            Browse by name or specialty. Booking links prefer provider-specific Calendly when available.
          </p>
        </div>
        <div className="w-full sm:w-80">
          <label htmlFor="q" className="sr-only">
            Search providers
          </label>
          <input
            id="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or specialty…"
            className="w-full rounded border px-3 py-2 text-sm"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-gray-600">No providers match “{query}”.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <li key={p.id} className="rounded border p-4">
              <div className="mb-2 flex items-start justify-between gap-3">
                <h2 className="text-lg font-medium">{p.name}</h2>
                {p.rate && (
                  <span className="rounded border px-2 py-0.5 text-xs">
                    ${Number(p.rate).toFixed(2)}
                  </span>
                )}
              </div>

              <p className="mb-3 line-clamp-3 text-sm text-gray-700">
                {p.description || '—'}
              </p>

              {p.topics.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {p.topics.map((t) => (
                    <span key={t.id} className="rounded border px-2 py-0.5 text-xs">
                      {t.name}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-4 flex items-center gap-2">
                <Link
                  href={resolveBookingHref(p.calendly_url)}
                  target={p.calendly_url ? '_blank' : undefined}
                  className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
                >
                  Book
                </Link>
                <Link
                  href={`/${encodeURIComponent(p.slug)}`}
                  className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
                >
                  View
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function resolveBookingHref(providerCalendlyUrl: string | null): string {
  // Prefer provider-specific Calendly; fallback to global dev URL; finally /book.
  const globalDevCalendly = process.env.NEXT_PUBLIC_CALENDLY_URL || '';
  return providerCalendlyUrl?.trim()
    ? providerCalendlyUrl
    : globalDevCalendly || '/book';
}
