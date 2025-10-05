// path: src/app/providers/[slug]/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { listVideos, type VideoListItem } from '@/lib/catalog';

/** --- Schema-aligned types --- */
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
  rate: string | null;        // numeric -> string
  created_at: string;
};

/** The view returns provider columns + aggregated topics JSON */
type ProviderWithTopicsRaw = ProviderRow & { topics: unknown };
type ProviderWithTopics    = ProviderRow & { topics: Topic[] };

type ViewState =
  | { kind: 'loading' }
  | { kind: 'notfound' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; provider: ProviderWithTopics; videos: VideoListItem[] };

function normalizeTopics(input: unknown): Topic[] {
  if (!Array.isArray(input)) return [];
  return input.filter(
    (t: unknown): t is Topic =>
      !!t &&
      typeof (t as Topic).id === 'number' &&
      typeof (t as Topic).slug === 'string' &&
      typeof (t as Topic).name === 'string'
  );
}

function resolveBookingHref(providerCalendlyUrl: string | null, providerId: number): string {
  const globalDevCalendly = process.env.NEXT_PUBLIC_CALENDLY_URL || '';
  return providerCalendlyUrl?.trim()
    ? providerCalendlyUrl
    : globalDevCalendly || `/book?provider=${encodeURIComponent(String(providerId))}`;
}

export default function ProviderDetailPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const [state, setState] = useState<ViewState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Use maybeSingle() to avoid the array/row generic mismatch.
        const { data, error } = await supabase
          .from('provider_with_topics')
          .select(
            'id, slug, name, description, calendly_url, rate, created_at, topics'
          )
          .eq('slug', slug)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          if (!cancelled) setState({ kind: 'notfound' });
          return;
        }

        // Assert the row shape (no `any`), then normalize topics.
        const raw = data as unknown as ProviderWithTopicsRaw;
        const provider: ProviderWithTopics = { ...raw, topics: normalizeTopics(raw.topics) };

        const videos = await listVideos({
          providerId: String(provider.id),
          onlyPublic: true,
        });

        if (!cancelled) setState({ kind: 'ready', provider, videos });
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : 'Failed to load provider.';
          setState({ kind: 'error', message: msg });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  /** Move hook to top-level so it’s never conditional */
  const providerForMemo = state.kind === 'ready' ? state.provider : null;
  const topics = useMemo(() => providerForMemo?.topics ?? [], [providerForMemo]);

  /* ---------- Render states ---------- */
  if (state.kind === 'loading') {
    return (
      <main className="container-page py-10">
        <section className="hero-gradient hero-glow rounded-2xl px-6 py-8 mb-6">
          <div className="skeleton h-8 w-1/2 mb-3" />
          <div className="skeleton h-4 w-2/3" />
        </section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-0 overflow-hidden">
              <div className="thumb-faux" />
              <div className="p-5 space-y-3">
                <div className="skeleton h-4 w-2/3 rounded" />
                <div className="skeleton h-3 w-1/3 rounded" />
              </div>
            </div>
          ))}
        </div>
      </main>
    );
  }

  if (state.kind === 'notfound') {
    return (
      <main className="container-page py-16 text-center">
        <h1 className="text-2xl font-semibold">Provider not found</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          The provider you’re looking for doesn’t exist or isn’t available.
        </p>
        <div className="mt-5">
          <Link href="/providers" className="btn-ghost">Back to providers</Link>
        </div>
      </main>
    );
  }

  if (state.kind === 'error') {
    return (
      <main className="container-page py-16 text-center">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-red-500">{state.message}</p>
        <div className="mt-5">
          <Link href="/providers" className="btn-ghost">Back to providers</Link>
        </div>
      </main>
    );
  }

  /* ---------- Ready ---------- */
  const { provider, videos } = state;
  const bookHref = resolveBookingHref(provider.calendly_url, provider.id);

  return (
    <main className="container-page py-8">
      {/* Header */}
      <section className="hero-gradient hero-glow rounded-2xl px-6 py-8 text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{provider.name}</h1>
            <p className="mt-2 text-sm text-white/70">
              {provider.description || 'Hypnotherapy professional.'}
            </p>
            {topics.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {topics.map((t) => (
                  <span key={t.id} className="pill pill-soft">{t.name}</span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {provider.rate && !Number.isNaN(Number(provider.rate)) && (
              <span className="pill pill-gold">${Number(provider.rate).toFixed(2)}</span>
            )}
            <a
              href={bookHref}
              target={provider.calendly_url ? '_blank' : undefined}
              rel={provider.calendly_url ? 'noopener noreferrer' : undefined}
              className="btn-primary"
            >
              Book
            </a>
            <Link href="/(public)/library" className="btn-ghost">
              Explore Library
            </Link>
          </div>
        </div>
      </section>

      {/* Recent sessions */}
      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Recent sessions</h2>

        {videos.length === 0 ? (
          <div className="card p-6">
            <p className="text-sm text-gray-600 dark:text-gray-300">No public sessions yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {videos.slice(0, 9).map((v) => {
              const href = `/watch/${v.id}`;
              return (
                <article key={v.id} className="card card-hover p-0 overflow-hidden">
                  <Link
                    href={href}
                    className="thumb-faux block focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40"
                  />
                  <div className="p-5">
                    <h3 className="line-clamp-2 text-base font-semibold tracking-tight">
                      <Link
                        href={href}
                        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 rounded"
                      >
                        {v.title}
                      </Link>
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">
                      {new Date(v.created_at).toLocaleDateString()}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <Link
                        href={href}
                        className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[#dbbe48] hover:bg-white/10 transition"
                      >
                        ▶ Play
                      </Link>
                      {v.topic_slug && (
                        <span className="pill pill-soft">{v.topic_slug.replace(/[-_]/g, ' ')}</span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
