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
      <main className="container-page py-10">
        <section className="rounded-2xl bg-[#0b1020] text-[#F9FAFB] px-6 py-10 hero-gradient hero-glow">
          <h1 className="text-3xl font-semibold tracking-tight">Providers</h1>
          <p className="mt-2 text-sm text-[#E5E7EB]/80">Loading providers…</p>
        </section>

        {/* Skeleton grid to keep the page lively while loading */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-0 overflow-hidden">
              <div className="skeleton h-[110px]" />
              <div className="p-5 space-y-3">
                <div className="skeleton h-4 w-2/3 rounded" />
                <div className="skeleton h-3 w-1/2 rounded" />
                <div className="flex gap-2">
                  <div className="skeleton h-5 w-20 rounded-full" />
                  <div className="skeleton h-5 w-16 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    );
  }

  if (state.kind === 'error') {
    return (
      <main className="container-page py-10">
        <section className="rounded-2xl bg-[#0b1020] text-[#F9FAFB] px-6 py-10 hero-gradient hero-glow">
          <h1 className="text-3xl font-semibold tracking-tight">Providers</h1>
          <p className="mt-2 text-sm text-red-400">Error: {state.message}</p>
        </section>
      </main>
    );
  }

  // ready
  return (
    <main className="container-page py-10">
      {/* Hero / Header */}
      <section className="rounded-2xl bg-[#0b1020] text-[#F9FAFB] px-6 py-8 hero-gradient hero-glow">
        <h1 className="text-3xl font-semibold tracking-tight">Providers</h1>
        <p className="mt-2 text-sm text-[#E5E7EB]/80">
          Discover hypnotherapists and their specialties. Booking links prefer provider-specific Calendly when available.
        </p>

        {/* Search */}
        <div className="mt-6 max-w-xl">
          <label htmlFor="q" className="sr-only">Search providers</label>
          <div className="flex items-center gap-2">
            <input
              id="q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, topic, or specialty…"
              className="w-full rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-[#F9FAFB] placeholder:text-[#E5E7EB]/60 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
            />
            <button
              type="button"
              onClick={() => setQuery('')}
              className="rounded-full px-3 py-2 text-sm text-[#dbbe48] hover:bg-white/10"
              aria-label="Clear search"
            >
              Clear
            </button>
          </div>
        </div>
      </section>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="card p-6 mt-6">
          <p className="text-gray-600 dark:text-gray-300">
            No providers match “{query}”.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <li
              key={p.id}
              className="card card-hover p-0 overflow-hidden bg-white/70 dark:bg-white/5"
            >
              {/* Faux thumbnail header with topic pills & rate */}
              <div className="thumb-faux flex items-end justify-between px-4 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  {(p.topics.slice(0, 2)).map((t) => (
                    <span key={t.id} className="pill pill-soft">
                      {t.name}
                    </span>
                  ))}
                  {p.topics.length > 2 && (
                    <span className="pill pill-soft">+{p.topics.length - 2}</span>
                  )}
                </div>

                {p.rate && (
                  <span
                    className="pill pill-gold"
                    title="Session rate"
                  >
                    ${Number(p.rate).toFixed(2)}
                  </span>
                )}
              </div>

              {/* Body */}
              <div className="p-5">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold tracking-tight">{p.name}</h2>
                </div>

                <p className="mb-3 line-clamp-3 text-sm text-gray-700 dark:text-gray-200">
                  {p.description || '—'}
                </p>

                {/* Topics (full list) */}
                {p.topics.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {p.topics.map((t) => (
                      <span
                        key={t.id}
                        className="pill pill-soft"
                      >
                        {t.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-4 flex items-center gap-2">
                  {/* Indigo primary for CTA */}
                  <Link
                    href={resolveBookingHref(p.calendly_url)}
                    target={p.calendly_url ? '_blank' : undefined}
                    className="btn-primary"
                  >
                    Book
                  </Link>
                  {/* Gold as accent (ghost) */}
                  <Link
                    href={`/${encodeURIComponent(p.slug)}`}
                    className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[#dbbe48] hover:bg-white/10 transition"
                  >
                    View
                  </Link>
                </div>
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
