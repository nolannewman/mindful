// path: app/(public)/library/page.tsx
'use client';

import { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  listTopics,          // kept (not used here, harmless)
  listProviders,
  listVideos,
  type Topic,
  type Provider,
  type VideoListItem,
} from '../../../lib/catalog';
import { supabase } from '@/lib/supabase/client';

type TopicMode = 'all' | 'mine';

function LibraryInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL → state (provider + topicMode + search)
  const providerFromUrl = searchParams.get('provider') || undefined;
  const modeFromUrl = (searchParams.get('mode') as TopicMode) || 'all';
  const qFromUrl = searchParams.get('q') || '';

  const providerId = useMemo(() => {
    if (!providerFromUrl || providerFromUrl.trim() === '') return undefined;
    return providerFromUrl;
  }, [providerFromUrl]);

  const [topicMode, setTopicMode] = useState<TopicMode>(modeFromUrl);
  const [query, setQuery] = useState(qFromUrl);

  // Data
  const [providers, setProviders] = useState<Provider[]>([]);
  const [videos, setVideos] = useState<VideoListItem[]>([]);
  const [myTopics, setMyTopics] = useState<string[]>([]); // slugs from users.topics_of_interest
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // URL setters
  const setParam = useCallback(
    (key: string, value?: string) => {
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      if (!value) params.delete(key);
      else params.set(key, value);
      const base = window.location.pathname;
      const next = params.toString() ? `${base}?${params.toString()}` : base;
      router.replace(next);
    },
    [router, searchParams],
  );

  const handleSelectProvider = useCallback(
    (provId?: string) => setParam('provider', provId),
    [setParam],
  );

  const handleClear = useCallback(() => {
    // Clear provider + search + mode → default to All
    const base = window.location.pathname;
    router.replace(base);
    setTopicMode('all');
    setQuery('');
  }, [router]);

  // Persist mode/search into URL (provider already handled via select)
  useEffect(() => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (topicMode && topicMode !== 'all') params.set('mode', topicMode);
    else params.delete('mode');

    if (query.trim()) params.set('q', query.trim());
    else params.delete('q');

    const base = window.location.pathname;
    const next = params.toString() ? `${base}?${params.toString()}` : base;
    // Only push if changed
    const current = `${base}${searchParams.toString() ? `?${searchParams}` : ''}`;
    if (current !== next) router.replace(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicMode, query]);

  // Load user topics_of_interest (if authed)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) {
          if (!cancelled) setMyTopics([]);
          return;
        }
        const { data, error } = await supabase
          .from('users')
          .select('topics_of_interest')
          .eq('id', userId)
          .single();
        if (error) {
          if (!cancelled) setMyTopics([]);
          return;
        }
        if (!cancelled) setMyTopics(Array.isArray(data?.topics_of_interest) ? data.topics_of_interest : []);
      } catch {
        if (!cancelled) setMyTopics([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Load providers + videos (public) whenever provider changes
  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setErr(null);
      try {
        const [/*t*/, p, v] = await Promise.all([
          listTopics().catch(() => [] as Topic[]), // safe no-op
          listProviders(undefined),
          listVideos({ topic: undefined, providerId, onlyPublic: true }),
        ]);
        if (cancelled) return;
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
    return () => { cancelled = true; };
  }, [providerId]);

  // Client-side filtering: topicMode (my topics), search query
  const filteredVideos = useMemo(() => {
    let out = videos;

    // Topic mode filter
    if (topicMode === 'mine') {
      if (myTopics.length === 0) {
        out = []; // no interests saved → no results (and we show a gentle hint)
      } else {
        // v.topic_slug should exist via videos_flat / listVideos items
        out = out.filter(v => v.topic_slug && myTopics.includes(v.topic_slug));
      }
    }

    // Search filter (title only; matches your current behavior)
    const q = query.trim().toLowerCase();
    if (q) {
      out = out.filter(v => v.title?.toLowerCase().includes(q));
    }

    return out;
  }, [videos, topicMode, myTopics, query]);

  return (
    <main className="container-page py-8">
      {/* Hero / Title */}
      <section className="rounded-2xl bg-[#0b1020] text-[#F9FAFB] px-6 py-8 hero-gradient hero-glow">
        <h1 className="text-3xl font-semibold tracking-tight">Sleep Hypnosis Library</h1>
        <p className="mt-2 text-sm text-[#E5E7EB]/80">
          Discover guided sessions from hypnotherapy professionals. Filter by your interests, provider, and search keywords.
        </p>
      </section>

      {/* Filters */}
      <section className="card p-4 mt-6">
        <div className="grid gap-4 md:grid-cols-3 md:items-center">
          {/* Topic mode toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTopicMode('all')}
              className={[
                'rounded-full px-3 py-1 text-sm border transition',
                topicMode === 'all'
                  ? 'border-white/20 bg-white/10 text-white'
                  : 'border-[#dbbe48]/60 text-[#dbbe48] hover:bg-white/5',
              ].join(' ')}
              aria-pressed={topicMode === 'all'}
            >
              All Topics
            </button>
            <button
              type="button"
              onClick={() => setTopicMode('mine')}
              className={[
                'rounded-full px-3 py-1 text-sm border transition',
                topicMode === 'mine'
                  ? 'border-white/20 bg-white/10 text-white'
                  : 'border-[#dbbe48]/60 text-[#dbbe48] hover:bg-white/5',
              ].join(' ')}
              aria-pressed={topicMode === 'mine'}
              title={myTopics.length ? '' : 'Sign in and set your interests to use My Topics'}
            >
              My Topics
            </button>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2">
            <label htmlFor="q" className="sr-only">Search library</label>
            <input
              id="q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles or descriptions…"
              className="w-full rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[#dbbe48] hover:bg-white/10 transition"
                aria-label="Clear search"
              >
                Clear
              </button>
            )}
          </div>

          {/* Provider select + clear */}
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="provider-select">
              Filter by provider
            </label>
            <select
              id="provider-select"
              className="w-full rounded-full border border-white/15 bg-white/10 px-3 py-2 text-sm"
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
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[#dbbe48] hover:bg-white/10 transition"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Hint for My Topics if empty */}
        {topicMode === 'mine' && myTopics.length === 0 && (
          <p className="mt-3 text-xs text-amber-600">
            You haven’t set any topics of interest yet. You can add them in the dashboard.
          </p>
        )}
      </section>

      {/* States */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-0 overflow-hidden">
              <div className="skeleton h-[110px]" />
              <div className="p-5 space-y-3">
                <div className="skeleton h-4 w-2/3 rounded" />
                <div className="skeleton h-3 w-1/3 rounded" />
                <div className="flex gap-2">
                  <div className="skeleton h-5 w-16 rounded-full" />
                  <div className="skeleton h-5 w-12 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {err && (
        <div className="card p-4 mt-6 border-red-200">
          <p className="text-sm text-red-600">Error: {err}</p>
        </div>
      )}

      {!loading && !err && filteredVideos.length === 0 && (
        <div className="card p-8 mt-6 text-center">
          <div className="mx-auto mb-3 h-10 w-10 rounded-full bg-white/10 grid place-items-center">🔎</div>
          <p className="text-sm text-gray-300">
            No sessions found. Try switching topic mode, changing provider, or clearing the search.
          </p>
        </div>
      )}

      {/* Video grid */}
      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredVideos.map((v) => {
          const disabled = v.pro;
          const href = `/watch/${v.id}`;
          return (
            <article
              key={v.id}
              className="card card-hover p-0 overflow-hidden relative bg-white/70 dark:bg-white/5"
            >
              {/* Faux thumbnail header (clickable if not gated) */}
              {disabled ? (
                <div className="thumb-faux flex items-end justify-between px-4 pb-3">
                  <span className="pill pill-soft">🌙 Sleep</span>
                  <span className="pill pill-gold" title="Pro content">🔒 Pro</span>
                </div>
              ) : (
                <Link href={href} className="thumb-faux flex items-end justify-between px-4 pb-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40">
                  <span className="pill pill-soft">🌙 Sleep</span>
                  {/* empty placeholder to keep spacing */}
                  <span />
                </Link>
              )}

              <div className="p-5">
                <div className="mb-3">
                  {disabled ? (
                    <h2 className="line-clamp-2 text-base font-semibold tracking-tight">{v.title}</h2>
                  ) : (
                    <Link href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 rounded">
                      <h2 className="line-clamp-2 text-base font-semibold tracking-tight">{v.title}</h2>
                    </Link>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    {new Date(v.created_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Meta row */}
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {v.topic_slug && (
                    <span className="pill pill-soft">{v.topic_slug.replace(/[-_]/g,' ')}</span>
                  )}
                  {!v.is_public && (
                    <span className="pill pill-soft bg-yellow-100/20 text-yellow-200 border-yellow-200/20">
                      Private
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-auto flex items-center justify-between">
                  {disabled ? (
                    <button
                      type="button"
                      className="cursor-not-allowed text-sm opacity-60"
                      aria-disabled
                      title="Available with Pro"
                    >
                      ▶ Play
                    </button>
                  ) : (
                    <Link
                      href={href}
                      className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[#dbbe48] hover:bg-white/10 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40"
                    >
                      ▶ Play
                    </Link>
                  )}
                </div>
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
