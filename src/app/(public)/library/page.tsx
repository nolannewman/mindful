// path: app/(public)/page.tsx
'use client';

import { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  listTopics,
  listProviders,
  listVideos,
  type Topic,
  type Provider,
  type VideoListItem,
} from '../../../../lib/catalog';

function LibraryInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL → state
  const topicFromUrl = searchParams.get('topic') || undefined;
  const providerFromUrl = searchParams.get('provider') || undefined;

  // Normalize “all/empty” to undefined so we actually show everything
  const topic = useMemo(() => {
    if (!topicFromUrl || topicFromUrl === 'all' || topicFromUrl.trim() === '') return undefined;
    return topicFromUrl;
  }, [topicFromUrl]);

  const providerId = useMemo(() => {
    if (!providerFromUrl || providerFromUrl.trim() === '') return undefined;
    return providerFromUrl;
  }, [providerFromUrl]);

  // Data
  const [topics, setTopics] = useState<Topic[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [videos, setVideos] = useState<VideoListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // URL setters
  const setParam = useCallback(
    (key: string, value?: string) => {
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      if (!value) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      const base = window.location.pathname;
      const next = params.toString() ? `${base}?${params.toString()}` : base;
      router.replace(next);
    },
    [router, searchParams],
  );

  const handleSelectTopic = useCallback(
    (slug?: string) => {
      // selecting "All" clears both topic & provider
      if (!slug) {
        const base = window.location.pathname;
        router.replace(base);
        return;
      }
      // when changing topic, also clear provider (since provider list will change)
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.set('topic', slug);
      params.delete('provider');
      const base = window.location.pathname;
      const next = `${base}?${params.toString()}`;
      router.replace(next);
    },
    [router, searchParams],
  );

  const handleSelectProvider = useCallback(
    (provId?: string) => setParam('provider', provId),
    [setParam],
  );

  const handleClear = useCallback(() => {
    // Clear BOTH topic and provider and show all public videos
    const base = window.location.pathname;
    router.replace(base);
  }, [router]);

  // Load data whenever filters change
  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setErr(null);
      try {
        const [t, p, v] = await Promise.all([
          listTopics(),
          listProviders(topic), // provider list depends on topic
          listVideos({ topic, providerId, onlyPublic: true }),
        ]);
        if (cancelled) return;
        setTopics(t);
        setProviders(p);
        setVideos(v);
      } catch (e: unknown) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : 'Failed to load';
          setErr(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [topic, providerId]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Sleep Hypnosis Library</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleSelectTopic(undefined)}
            className={`rounded-full border px-3 py-1 text-sm ${!topic ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'}`}
            aria-label="Show all topics"
          >
            All Topics
          </button>

          {/* Topic chips */}
          <div className="flex flex-wrap gap-2">
            {topics.map((t) => {
              const active = topic === t.slug;
              return (
                <button
                  key={t.id}
                  onClick={() => handleSelectTopic(t.slug)}
                  className={`rounded-full border px-3 py-1 text-sm ${active ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'}`}
                  aria-pressed={active}
                  aria-label={`Filter by ${t.name}`}
                >
                  {t.name}
                </button>
              );
            })}
          </div>

          {/* Provider select */}
          <label className="sr-only" htmlFor="provider-select">
            Filter by provider
          </label>
          <select
            id="provider-select"
            className="rounded-md border px-3 py-2 text-sm"
            value={providerId ?? ''}
            onChange={(e) => handleSelectProvider(e.target.value || undefined)}
            aria-label="Filter by provider"
          >
            <option value="">All Providers</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleClear}
            className="rounded-md border px-3 py-2 text-sm hover:bg-gray-100"
            aria-label="Clear all filters"
          >
            Clear filters
          </button>
        </div>
      </header>

      {/* States */}
      {loading && <p className="text-sm text-gray-500">Loading…</p>}
      {err && <p className="text-sm text-red-600">Error: {err}</p>}
      {!loading && !err && videos.length === 0 && (
        <p className="text-sm text-gray-500">
          No sessions found. Try changing or clearing filters.
        </p>
      )}

      {/* Video grid */}
      <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((v) => {
          const disabled = v.pro; // lock if paywalled
          return (
            <article key={v.id} className="relative rounded-xl border p-4 shadow-sm">
              {/* Lock badge */}
              {v.pro && (
                <span
                  className="absolute right-3 top-3 rounded-full border px-2 py-0.5 text-[11px] font-medium"
                  title="Pro content"
                >
                  🔒 Pro
                </span>
              )}

              <div className="mb-3">
                <h2 className="line-clamp-2 text-base font-medium">{v.title}</h2>
                <p className="mt-1 text-xs text-gray-500">
                  {new Date(v.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="mt-auto flex items-center justify-between">
                {disabled ? (
                  <button
                    type="button"
                    className="cursor-not-allowed text-sm opacity-60"
                    aria-disabled
                    title="Available with Pro"
                  >
                    Play
                  </button>
                ) : (
                  <a
                    href={`/watch/${v.id}`}
                    className="text-sm underline decoration-2 underline-offset-2 hover:opacity-80"
                  >
                    Play
                  </a>
                )}

                {!v.is_public && (
                  <span className="rounded bg-yellow-100 px-2 py-0.5 text-[11px] font-medium text-yellow-800">
                    Private
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-gray-500">Loading…</div>}>
      <LibraryInner />
    </Suspense>
  );
}
