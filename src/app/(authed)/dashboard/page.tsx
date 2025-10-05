// path: src/app/(authed)/dashboard/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { listTopics, listVideos, type Topic, type VideoListItem } from '@/lib/catalog';

type ViewState =
  | { kind: 'loading' }
  | { kind: 'need-auth' }
  | { kind: 'ready'; displayName: string | null; allTopics: Topic[]; myTopics: string[]; recs: VideoListItem[] }
  | { kind: 'error'; message: string };

export default function DashboardPage() {
  const [state, setState] = useState<ViewState>({ kind: 'loading' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const topicsRef = useRef<HTMLDivElement>(null);

  // ---------- Effects ----------
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setMsg(null);

        // 1) Auth
        const { data: auth } = await supabase.auth.getUser();
        const user = auth.user;
        if (!user) {
          if (!cancelled) setState({ kind: 'need-auth' });
          return;
        }

        // 2) Profile
        const { data: profile, error } = await supabase
          .from('users')
          .select('display_name, topics_of_interest')
          .eq('id', user.id)
          .maybeSingle();
        if (error) throw error;

        const displayName =
          (profile?.display_name as string | null) ??
          (user.email ? user.email.split('@')[0] : null);

        const my = Array.isArray(profile?.topics_of_interest)
          ? (profile!.topics_of_interest as string[])
          : [];

        // 3) All topics
        const allTopics = await listTopics();

        // 4) Latest public videos, filter by my topics if any
        const latest = await listVideos({ topic: undefined, providerId: undefined, onlyPublic: true });
        const recs = (my.length
          ? latest.filter(v => v.topic_slug && my.includes(v.topic_slug))
          : latest
        ).slice(0, 6);

        if (!cancelled) {
          setState({ kind: 'ready', displayName, allTopics, myTopics: my, recs });
        }
      } catch (e) {
        if (!cancelled) {
          setState({
            kind: 'error',
            message: e instanceof Error ? e.message : 'Failed to load your dashboard.',
          });
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // ---------- Hooks that must run every render ----------
  const sortedTopics = useMemo(() => {
    if (state.kind !== 'ready') return [] as Topic[];
    const popular = ['deep-sleep', 'insomnia-relief', 'anxiety-calm', 'sleep-hypnosis'];
    const pop = new Set(popular);
    const a = state.allTopics.filter(t => pop.has(t.slug));
    const b = state.allTopics
      .filter(t => !pop.has(t.slug))
      .sort((x, y) => x.name.localeCompare(y.name));
    return [...a, ...b];
  }, [state]);

  const mySet = useMemo(() => {
    if (state.kind !== 'ready') return new Set<string>();
    return new Set(state.myTopics);
  }, [state]);

  // ---------- Actions ----------
  const toggleTopic = (slug: string) => {
    setState(prev => {
      if (prev.kind !== 'ready') return prev;
      const has = prev.myTopics.includes(slug);
      const next = has ? prev.myTopics.filter(s => s !== slug) : [...prev.myTopics, slug];
      return { ...prev, myTopics: next };
    });
  };

  const saveTopics = async () => {
    if (state.kind !== 'ready') return;
    setSaving(true);
    setMsg(null);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const id = auth.user?.id;
      if (!id) {
        setMsg('You must be signed in.');
        setSaving(false);
        return;
      }
      const { error } = await supabase
        .from('users')
        .upsert({ id, topics_of_interest: state.myTopics }, { onConflict: 'id' });
      if (error) throw error;
      setMsg('Preferences saved ✔︎');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  // ---------- Render states ----------
  if (state.kind === 'loading') {
    return (
      <main className="container-page py-10">
        <section className="hero-gradient hero-glow rounded-2xl px-6 py-8 mb-6">
          <div className="skeleton h-7 w-1/2 mb-3" />
          <div className="skeleton h-4 w-2/3" />
        </section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-5">
              <div className="skeleton h-4 w-1/2 mb-3" />
              <div className="skeleton h-8 w-full" />
            </div>
          ))}
        </div>
      </main>
    );
  }

  if (state.kind === 'need-auth') {
    return (
      <main className="container-page py-12 text-center">
        <section className="hero-gradient hero-glow rounded-2xl px-6 py-10 mb-6">
          <h1 className="text-3xl font-semibold tracking-tight text-white">Dashboard</h1>
          <p className="mt-2 text-sm text-white/70">Please sign in to manage your preferences.</p>
          <div className="mt-5">
            <Link href="/login" className="btn-primary">Sign in</Link>
          </div>
        </section>
      </main>
    );
  }

  if (state.kind === 'error') {
    return (
      <main className="container-page py-12">
        <section className="hero-gradient hero-glow rounded-2xl px-6 py-8 mb-6">
          <h1 className="text-3xl font-semibold tracking-tight text-white">Dashboard</h1>
          <p className="mt-2 text-sm text-red-300">Error: {state.message}</p>
        </section>
      </main>
    );
  }

  // ---------- Ready ----------
  const { displayName, recs } = state;

  return (
    <main className="container-page py-10">
      {/* Hero */}
      <section className="hero-gradient hero-glow rounded-2xl px-6 py-8 mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Welcome{displayName ? `, ${displayName}` : ''}.
        </h1>
        <p className="mt-2 text-sm text-white/70">
          This is your home base. Set your topics, then head to the Library and switch to <em>My Topics</em> for a tailored feed.
        </p>
        {msg && <p className="mt-3 text-sm text-amber-200">{msg}</p>}

        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/library" className="btn-primary">Open Library</Link>
          <Link href="/providers" className="btn-ghost">Browse Providers</Link>
          <Link href="/book" className="btn-ghost">Book a Session</Link>
          <button
            className="btn-ghost"
            onClick={() => topicsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            Edit Topics
          </button>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Topics manager */}
        <section ref={topicsRef} className="lg:col-span-7">
          <div className="card p-6">
            <h2 className="text-lg font-semibold tracking-tight mb-3">Topics of interest</h2>
            {state.myTopics.length === 0 && (
              <p className="mb-4 text-sm text-amber-600">
                You haven’t selected any topics yet. Choose a few below to personalize your Library.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {sortedTopics.map(t => {
                const active = mySet.has(t.slug);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTopic(t.slug)}
                    aria-pressed={active}
                    className={['pill transition', active ? 'pill-gold' : 'pill-soft hover:bg-white/20'].join(' ')}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={saveTopics}
                disabled={saving}
                className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving…' : 'Save preferences'}
              </button>
              <button
                onClick={() =>
                  setState(s => (s.kind === 'ready' ? { ...s, myTopics: [] } : s))
                }
                className="btn-ghost"
              >
                Clear all
              </button>
            </div>
          </div>
        </section>

        {/* Recommendations / activity */}
        <aside className="lg:col-span-5 space-y-4">
          <div className="card p-5">
            <h3 className="font-medium mb-2">Recommendations</h3>
            {recs.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Add a couple of topics to see suggestions here.
              </p>
            ) : (
              <ul className="space-y-3">
                {recs.map(v => (
                  <li key={v.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{v.title}</p>
                      <p className="text-xs text-gray-500">
                        {v.topic_slug?.replace(/[-_]/g, ' ') || '—'} • {new Date(v.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Link
                      href={`/watch/${v.id}`}
                      className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm text-[#dbbe48] hover:bg-white/10 transition"
                    >
                      ▶ Play
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card p-5">
            <h3 className="font-medium mb-2">Good to know</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Content is created by hypnotherapy professionals. Sleep Trance doesn’t provide medical care; for clinical issues, consult a licensed provider.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
