// path: app/(public)/page.tsx
'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  listTopics,
  listProviders,
  listVideos,
  type Topic,
  type Provider,
  type VideoListItem as Video,
} from '@/../lib/catalog';

/** Suspense-friendly loading shell shown while search params resolve. */
function LibraryLoading() {
  return (
    <main className="p-6 sm:p-8" aria-busy="true" aria-live="polite">
      <h1 className="text-2xl font-semibold">Library</h1>
      <p className="mt-2 text-sm text-foreground/70">
        Browse videos by topic and provider.
      </p>
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-4 animate-pulse">
            <div className="aspect-video w-full rounded bg-foreground/10" />
            <div className="h-4 mt-3 w-3/4 bg-foreground/10 rounded" />
            <div className="h-4 mt-2 w-1/2 bg-foreground/10 rounded" />
          </div>
        ))}
      </div>
    </main>
  );
}

/** Small UI chip for topic toggles. */
function Chip(props: {
  selected?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  'aria-label'?: string;
}) {
  const { selected, children, onClick } = props;
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={[
        'px-3 py-1.5 rounded-full text-sm border transition',
        selected
          ? 'bg-foreground text-background border-foreground'
          : 'bg-transparent hover:bg-foreground/10 border-foreground/30',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

/** Individual video card with basic placeholder thumbnail. */
function VideoCard({ video }: { video: Video }) {
  return (
    <article
      className="border rounded-lg p-4 h-full flex flex-col gap-2"
      aria-labelledby={`video-${video.id}-title`}
    >
      <div
        className="aspect-video w-full rounded bg-foreground/10 overflow-hidden"
        role="img"
        aria-label="Video thumbnail"
      />
      <h3 id={`video-${video.id}-title`} className="text-base font-medium line-clamp-2">
        {video.title || 'Untitled video'}
      </h3>
      <div className="mt-auto">
        <a
          href={`/watch/${video.id}`}
          className="inline-flex items-center gap-2 text-sm underline underline-offset-4"
          aria-label={`Watch ${video.title ?? 'video'}`}
        >
          Watch <span aria-hidden>→</span>
        </a>
      </div>
    </article>
  );
}

/** Hook to read & write URL search params (?topic, ?provider). */
function useLibraryFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const topic = searchParams.get('topic') || '';
  const providerId = searchParams.get('provider') || '';

  const setParam = (key: string, value?: string) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (value && value.length) sp.set(key, value);
    else sp.delete(key);
    const qs = sp.toString();
    // Route group (public) does not appear in URL; the library is '/'.
    router.replace(qs ? `/?${qs}` : '/');
  };

  return {
    topic,
    providerId,
    setTopic: (v?: string) => setParam('topic', v),
    setProvider: (v?: string) => setParam('provider', v),
  };
}

/**
 * Inner client component that uses `useSearchParams()`.
 * Must be wrapped by <Suspense> in the default export to satisfy Next.js CSR bailout rules.
 */
function LibraryPageClient() {
  const { topic, providerId, setTopic, setProvider } = useLibraryFilters();

  const [topics, setTopics] = useState<Topic[] | null>(null);
  const [providers, setProviders] = useState<Provider[] | null>(null);
  const [videos, setVideos] = useState<Video[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch whenever filters change
  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const [t, p, v] = await Promise.all([
          listTopics(),
          listProviders(topic || undefined),
          listVideos({
            topic: topic || undefined,
            providerId: providerId || undefined,
            onlyPublic: true,
          }),
        ]);
        if (cancelled) return;
        setTopics(t ?? []);
        setProviders(p ?? []);
        setVideos(v ?? []);
      } catch (e: unknown) {
        if (!cancelled) {
          const msg =
            e instanceof Error ? e.message : 'Failed to load library content.';
          setError(msg);
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

  const activeTopicName = useMemo(
    () => topics?.find((t) => t.slug === topic)?.name ?? null,
    [topics, topic],
  );

  return (
    <main className="p-6 sm:p-8">
      <h1 className="text-2xl font-semibold">Library</h1>
      <p className="mt-2 text-sm text-foreground/70">
        Browse videos by topic and provider.
      </p>

      {/* Filters */}
      <section className="mt-6 space-y-4" aria-labelledby="filters-title">
        <h2 id="filters-title" className="sr-only">
          Filters
        </h2>

        {/* Topic chips */}
        <div className="flex flex-wrap gap-2">
          <Chip selected={!topic} onClick={() => setTopic(undefined)}>
            All
          </Chip>
          {(topics ?? []).map((t) => (
            <Chip
              key={t.id}
              selected={topic === t.slug}
              onClick={() => setTopic(t.slug)}
            >
              {t.name}
            </Chip>
          ))}
        </div>

        {/* Provider select */}
        <div className="flex items-center gap-3">
          <label htmlFor="provider" className="text-sm">
            Provider
          </label>
          <select
            id="provider"
            name="provider"
            className="min-w-44 rounded border px-3 py-2 bg-background"
            value={providerId}
            onChange={(e) => setProvider(e.target.value || undefined)}
          >
            <option value="">All providers</option>
            {(providers ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {(providerId || topic) && (
            <button
              type="button"
              className="ml-auto text-sm underline underline-offset-4"
              onClick={() => {
                setTopic(undefined);
                setProvider(undefined);
              }}
              aria-label="Clear filters"
            >
              Clear filters
            </button>
          )}
        </div>
      </section>

      {/* Results */}
      <section className="mt-8" aria-live="polite" aria-busy={loading}>
        {error && (
          <div
            role="alert"
            className="rounded border border-red-500/40 bg-red-500/5 p-4"
          >
            <p className="font-medium">Something went wrong.</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-4 animate-pulse">
                <div className="aspect-video w-full rounded bg-foreground/10" />
                <div className="h-4 mt-3 w-3/4 bg-foreground/10 rounded" />
                <div className="h-4 mt-2 w-1/2 bg-foreground/10 rounded" />
              </div>
            ))}
          </div>
        )}

        {!loading && !error && (videos?.length ?? 0) === 0 && (
          <div className="rounded border p-6 text-sm">
            No videos found
            {topic ? ` for “${activeTopicName ?? topic}”` : ''}
            {providerId ? ' with selected provider' : ''}.
          </div>
        )}

        {!loading && !error && (videos?.length ?? 0) > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos!.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

/**
 * Default export: Suspense-wrapped client page.
 * Required when using `useSearchParams()` in App Router.
 */
export default function LibraryPage() {
  return (
    <Suspense fallback={<LibraryLoading />}>
      <LibraryPageClient />
    </Suspense>
  );
}
