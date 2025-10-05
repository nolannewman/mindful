// path: src/app/watch/[id]/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getVideo } from '@/lib/catalog';
import { getSignedUrl } from '@/lib/storage';

type MediaProvider = 'YOUTUBE' | 'VIMEO' | 'FILE' | 'AUDIO';

type DbVideo = {
  id: string;
  title: string | null;
  description: string | null;
  media_provider?: MediaProvider;
  embed_id?: string | null;
  storage_path?: string | null;
  provider_id: string | null;
  created_at?: string | null;
  is_public?: boolean | null;
  pro?: boolean | null;
};

type PageProps = { params: { id: string } };

export default function WatchPage({ params }: PageProps) {
  const { id } = params;
  const [video, setVideo] = useState<DbVideo | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [status, setStatus] =
    useState<'idle' | 'loading' | 'ready' | 'notfound' | 'error' | 'locked' | 'private'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);

  // Provider-specific embed src (no autoplay)
  const embedSrc = useMemo(() => {
    if (!video) return null;
    const idSafe = video.embed_id ? encodeURIComponent(video.embed_id) : null;

    if (video.media_provider === 'YOUTUBE' && idSafe) {
      return `https://www.youtube-nocookie.com/embed/${idSafe}?rel=0&modestbranding=1&playsinline=1`;
    }
    if (video.media_provider === 'VIMEO' && idSafe) {
      return `https://player.vimeo.com/video/${idSafe}`;
    }
    return null;
  }, [video]);

  useEffect(() => {
    let cancelled = false;

    async function run(): Promise<void> {
      try {
        setStatus('loading');
        setError(null);
        setSignedUrl(null);
        setMediaError(null);

        const v = (await getVideo(id)) as unknown as DbVideo | null;

        if (cancelled) return;

        if (!v) {
          setStatus('notfound');
          return;
        }

        const pro = Boolean(v.pro);
        const isPublic = v.is_public !== false;

        if (!isPublic) {
          setVideo(v);
          setStatus('private');
          return;
        }
        if (pro) {
          setVideo(v);
          setStatus('locked');
          return;
        }

        setVideo(v);

        if ((v.media_provider === 'FILE' || v.media_provider === 'AUDIO') && v.storage_path) {
          try {
            const result = await getSignedUrl(v.storage_path, 3600);
            if (cancelled) return;

            if (result.ok) {
              // Use as-is. The <source type="video/mp4"> below helps browsers pick the decoder.
              setSignedUrl(result.url);
            } else {
              setSignedUrl(null);
              setError('Could not generate a secure media URL.');
            }
          } catch {
            if (!cancelled) {
              setError('Could not generate a secure media URL.');
            }
          }
        }

        if (!cancelled) setStatus('ready');
      } catch {
        if (!cancelled) {
          setError('Something went wrong loading this video.');
          setStatus('error');
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const providerQuery = video?.provider_id ? `?provider=${encodeURIComponent(video.provider_id)}` : '';
  const bookHref = `/book${providerQuery}`;

  /* ---------------- Loading / Error States ---------------- */

  if (status === 'idle' || status === 'loading') {
    return (
      <main className="container-page py-8">
        <section className="hero-gradient hero-glow rounded-2xl px-6 py-6 mb-6">
          <div className="skeleton h-7 w-3/4 mb-4"></div>
          <div className="skeleton h-10 w-1/3"></div>
        </section>

        <div className="card p-0 overflow-hidden">
          <div className="skeleton h-[56.25vw] max-h-[60vh] min-h-[200px]"></div>
          <div className="p-5 space-y-3">
            <div className="skeleton h-4 w-2/3"></div>
            <div className="skeleton h-4 w-1/2"></div>
            <div className="skeleton h-10 w-28"></div>
          </div>
        </div>
      </main>
    );
  }

  if (status === 'notfound') {
    return (
      <main className="container-page py-10 text-center">
        <h1 className="mb-2 text-2xl font-semibold">Video not found</h1>
        <p className="mb-6 text-gray-600">The video you’re looking for doesn’t exist or isn’t available.</p>
        <Link href="/" className="btn-ghost">← Back to Library</Link>
      </main>
    );
  }

  if (status === 'private') {
    const title = video?.title ?? 'Untitled';
    return (
      <main className="container-page py-10 text-center">
        <h1 className="mb-2 text-2xl font-semibold">{title}</h1>
        <p className="mb-6 text-gray-600">This session isn’t publicly available.</p>
        <Link href="/" className="btn-ghost">← Back to Library</Link>
      </main>
    );
  }

  if (status === 'locked') {
    const title = video?.title ?? 'Pro Session';
    return (
      <main className="container-page py-10 text-center">
        <h1 className="mb-2 text-2xl font-semibold">{title}</h1>
        <div className="mb-4 inline-flex items-center gap-2 pill pill-gold">
          <span aria-hidden>🔒</span> Pro content
        </div>
        <p className="mb-6 text-gray-600">
          This session is available with a subscription. Book a session to learn more or get access.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/" className="btn-ghost">← Back</Link>
          <Link href={bookHref} className="btn-primary">Book session</Link>
        </div>
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main className="container-page py-10 text-center">
        <h1 className="mb-2 text-2xl font-semibold">Unable to load</h1>
        <p className="mb-6 text-gray-600">{error ?? 'Please try again later.'}</p>
        <Link href="/" className="btn-ghost">← Back to Library</Link>
      </main>
    );
  }

  /* ---------------- Ready ---------------- */

  const title = video?.title ?? 'Untitled';
  const description = video?.description ?? '';

  return (
    <main className="container-page py-8">
      {/* Hero header */}
      <section className="hero-gradient hero-glow rounded-2xl px-6 py-6 mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
        <p className="mt-1 text-sm text-white/70">
          {new Date(video?.created_at ?? Date.now()).toLocaleDateString()}
        </p>
      </section>

      {/* Responsive layout: player (8) + meta (4) on lg+ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Player shell */}
        <section className="lg:col-span-8">
          <div className="card p-0 overflow-hidden">
            {/* FILE (video) */}
            {video?.media_provider === 'FILE' && (
              <div className="w-full">
                {signedUrl ? (
                  <video
                    key={signedUrl}              /* force reload if URL changes */
                    controls
                    playsInline
                    preload="metadata"
                    crossOrigin="anonymous"
                    className="w-full aspect-video"
                    onError={() => setMediaError('The video failed to load.')}
                    aria-label={`Video player for ${title}`}
                  >
                    {/* Time fragment hints some browsers to fetch metadata */}
                    <source src={`${signedUrl}#t=0.001`} type="video/mp4" />
                  </video>
                ) : (
                  <div className="aspect-video w-full grid place-items-center text-sm text-gray-600">
                    Generating secure link…
                  </div>
                )}
              </div>
            )}

            {/* AUDIO */}
            {video?.media_provider === 'AUDIO' && (
              <div className="p-5">
                {signedUrl ? (
                  <audio
                    key={signedUrl}
                    controls
                    preload="metadata"
                    crossOrigin="anonymous"
                    src={signedUrl}
                    className="w-full"
                    onError={() => setMediaError('The audio failed to load.')}
                    aria-label={`Audio player for ${title}`}
                  />
                ) : (
                  <div className="rounded border border-white/10 p-4 text-center text-sm text-gray-600">
                    Generating secure link…
                  </div>
                )}
              </div>
            )}

            {/* YOUTUBE / VIMEO */}
            {(video?.media_provider === 'YOUTUBE' || video?.media_provider === 'VIMEO') && embedSrc && (
              <div className="w-full aspect-video">
                <iframe
                  key={embedSrc}
                  title={`${title} — ${video.media_provider} player`}
                  src={embedSrc}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="origin-when-cross-origin"
                  className="h-full w-full"
                />
              </div>
            )}

            {/* Fallbacks */}
            {!embedSrc &&
              (video?.media_provider === 'YOUTUBE' || video?.media_provider === 'VIMEO') &&
              !video?.embed_id && (
                <div className="p-5 text-center text-sm text-red-500">
                  Missing embed ID for this provider.
                </div>
              )}
            {(video?.media_provider === 'FILE' || video?.media_provider === 'AUDIO') &&
              !video?.storage_path && (
                <div className="p-5 text-center text-sm text-red-500">
                  Missing storage path for this media.
                </div>
              )}
          </div>

          {/* Inline media error fallback (still give the user a way forward) */}
          {mediaError && signedUrl && (
            <div className="mt-3 text-sm">
              <div className="text-red-400 mb-1">{mediaError}</div>
              <a href={signedUrl} target="_blank" rel="noreferrer" className="btn-ghost">
                Open in new tab
              </a>
            </div>
          )}
        </section>

        {/* Meta / Description / CTA */}
        <aside className="lg:col-span-4 space-y-4">
          {description && (
            <section className="card p-5">
              <h2 className="mb-2 text-sm font-medium text-white/80">About this session</h2>
              <p className="text-sm text-gray-200 whitespace-pre-wrap">{description}</p>
            </section>
          )}
          <section className="card p-5 flex items-center justify-between">
            <div className="text-sm text-gray-300">Ready for a 1:1 session?</div>
            <Link href={bookHref} className="btn-primary">Book session</Link>
          </section>

          <section className="card p-5">
            <Link href="/" className="btn-ghost">← Back to Library</Link>
          </section>
        </aside>
      </div>
    </main>
  );
}
