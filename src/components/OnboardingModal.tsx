// path: src/components/OnboardingModal.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { listTopics, type Topic } from '@/lib/catalog';

type Phase = 'idle' | 'checking' | 'open' | 'saving' | 'closed';

const LOCAL_DISMISS_KEY = 'onboarding-topics-dismissed-v1';

export default function OnboardingModal() {
  const [phase, setPhase] = useState<Phase>('checking');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Decide whether to show
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setErr(null);
        // Respect "skip for now"
        const skipped = typeof window !== 'undefined' && localStorage.getItem(LOCAL_DISMISS_KEY);
        if (skipped) {
          if (!cancelled) setPhase('closed');
          return;
        }

        // Auth state
        const { data: auth } = await supabase.auth.getUser();
        const user = auth.user;
        if (!user) {
          if (!cancelled) setPhase('closed');
          return;
        }

        // Load profile prefs
        const { data: profile } = await supabase
          .from('users')
          .select('topics_of_interest')
          .eq('id', user.id)
          .maybeSingle();

        const mine = Array.isArray(profile?.topics_of_interest)
          ? (profile!.topics_of_interest as string[])
          : [];

        // Already has topics → close
        if (mine.length > 0) {
          if (!cancelled) setPhase('closed');
          return;
        }

        // Load all topics for selection
        const all = await listTopics();
        if (cancelled) return;

        setTopics(all);
        setSelected(mine);
        setPhase('open');
      } catch (e) {
        if (!cancelled) {
          // Fail silently (don’t block app if something odd happens)
          setPhase('closed');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Accessibility: focus the dialog when opened
  useEffect(() => {
    if (phase === 'open') {
      dialogRef.current?.focus();
    }
  }, [phase]);

  const popularFirst = useMemo(() => {
    const popular = new Set(['deep-sleep', 'insomnia-relief', 'anxiety-calm', 'sleep-hypnosis']);
    const a = topics.filter(t => popular.has(t.slug));
    const b = topics.filter(t => !popular.has(t.slug)).sort((x, y) => x.name.localeCompare(y.name));
    return [...a, ...b];
  }, [topics]);

  const toggle = (slug: string) => {
    setSelected(cur => (cur.includes(slug) ? cur.filter(s => s !== slug) : [...cur, slug]));
  };

  const save = async () => {
    setPhase('saving');
    setErr(null);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const id = auth.user?.id;
      if (!id) {
        setErr('Please sign in again.');
        setPhase('open');
        return;
      }
      const { error } = await supabase
        .from('users')
        .upsert({ id, topics_of_interest: selected }, { onConflict: 'id' });

      if (error) {
        setErr(error.message);
        setPhase('open');
        return;
      }

      // Don’t re-open immediately after saving
      localStorage.setItem(LOCAL_DISMISS_KEY, '1');
      setPhase('closed');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save.');
      setPhase('open');
    }
  };

  const skip = () => {
    try { localStorage.setItem(LOCAL_DISMISS_KEY, '1'); } catch {}
    setPhase('closed');
  };

  if (phase === 'closed' || phase === 'checking') return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      aria-labelledby="onboarding-title"
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="w-full max-w-lg outline-none"
      >
        <div className="card p-0 overflow-hidden">
          {/* Header */}
          <div className="hero-gradient px-6 py-5">
            <h2 id="onboarding-title" className="text-xl font-semibold text-white">
              Pick a few topics to personalize your feed
            </h2>
            <p className="mt-1 text-sm text-white/70">
              You can change these anytime in your Dashboard.
            </p>
          </div>

          {/* Body */}
          <div className="p-6">
            {err && <p className="mb-3 text-sm text-red-500">{err}</p>}

            {topics.length === 0 ? (
              <div className="space-y-2">
                <div className="skeleton h-6 w-1/2" />
                <div className="grid grid-cols-2 gap-2">
                  {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-8 rounded" />)}
                </div>
              </div>
            ) : (
              <ul className="grid grid-cols-2 gap-2">
                {popularFirst.map(t => {
                  const active = selected.includes(t.slug);
                  return (
                    <li key={t.id}>
                      <label className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm cursor-pointer transition
                                         ${active ? 'border-[#dbbe48] text-[#dbbe48] bg-white/5' : 'border-white/10 hover:bg-white/5'}`}>
                        <input
                          type="checkbox"
                          className="accent-[#dbbe48]"
                          checked={active}
                          onChange={() => toggle(t.slug)}
                        />
                        <span className="truncate">{t.name}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Actions */}
            <div className="mt-5 flex items-center justify-between">
              <button
                onClick={skip}
                className="btn-ghost"
              >
                Skip for now
              </button>
              <button
                onClick={save}
                disabled={phase === 'saving'}
                className="btn-primary disabled:opacity-60"
              >
                {phase === 'saving' ? 'Saving…' : 'Save & continue'}
              </button>
            </div>
          </div>
        </div>

        {/* Click-outside to skip */}
        <button
          className="sr-only"
          aria-hidden
          tabIndex={-1}
          onClick={skip}
        />
      </div>
    </div>
  );
}
