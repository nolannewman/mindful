// path: src/app/watch/[id]/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getVideo } from '@/../lib/catalog';
import { getSignedUrl } from '@/../lib/storage';

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

type PageProps = {
  params: { id: string };
};

export default function WatchPage({ params }: PageProps) {
  const { id } = params;
  const [video, setVideo] = useState<DbVideo | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [status, setStatus] =
    useState<'idle' | 'loading' | 'ready' | 'notfound' | 'error' | 'locked' | 'private'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Build provider-specific embed src (no autoplay)
  const embedSrc = useMemo(() => {
    if (!video) return null;
    const idSafe = video.embed_id ? encodeURIComponent(video.embed_id) : null;

    if (video.media_provider === 'YOUTUBE' && idSafe) {
      // Use privacy-enhanced domain + no autoplay
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

  const providerQuery = video?.provider_id
    ? `?provider=${encodeURIComponent(video.provider_id)}`
    : '';
  const bookHref = `/book${providerQuery}`;

  // Loading state
  if (status === 'idle' || status === 'loading') {
    return (
      <main className="mx-auto max-w-4xl p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-3/4 rounded bg-gray-200" />
          <div className="aspect-video w-full rounded bg-gray-200" />
          <div className="h-24 w-full rounded bg-gray-200" />
        </div>
      </main>
    );
  }

  // Not found
  if (status === 'notfound') {
    return (
      <main className="mx-auto max-w-2xl p-6 text-center">
        <h1 className="mb-2 text-2xl font-semibold">Video not found</h1>
        <p className="mb-6 text-gray-600">
          The video you’re looking for doesn’t exist or isn’t available.
        </p>
        <Link
          href="/"
          className="inline-block rounded border px-4 py-2 text-sm hover:bg-gray-50"
          aria-label="Go back to library"
        >
          ← Back to Library
        </Link>
      </main>
    );
  }

  // Private/unpublished
  if (status === 'private') {
    const title = video?.title ?? 'Untitled';
    return (
      <main className="mx-auto max-w-2xl p-6 text-center">
        <h1 className="mb-2 text-2xl font-semibold">{title}</h1>
        <p className="mb-6 text-gray-600">This session isn’t publicly available.</p>
        <Link href="/" className="inline-block rounded border px-4 py-2 text-sm hover:bg-gray-50">
          ← Back to Library
        </Link>
      </main>
    );
  }

  // Locked (pro)
  if (status === 'locked') {
    const title = video?.title ?? 'Pro Session';
    return (
      <main className="mx-auto max-w-2xl p-6 text-center">
        <h1 className="mb-2 text-2xl font-semibold">{title}</h1>
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
          <span aria-hidden>🔒</span> Pro content
        </div>
        <p className="mb-6 text-gray-600">
          This session is available with a subscription. Book a session to learn more or get access.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/" className="rounded border px-4 py-2 text-sm hover:bg-gray-50">
            ← Back
          </Link>
          <Link href={bookHref} className="rounded bg-black px-4 py-2 text-sm text-white hover:opacity-90">
            Book session
          </Link>
        </div>
      </main>
    );
  }

  // Error
  if (status === 'error') {
    return (
      <main className="mx-auto max-w-2xl p-6 text-center">
        <h1 className="mb-2 text-2xl font-semibold">Unable to load</h1>
        <p className="mb-6 text-gray-600">{error ?? 'Please try again later.'}</p>
        <Link
          href="/"
          className="inline-block rounded border px-4 py-2 text-sm hover:bg-gray-50"
          aria-label="Go back to library"
        >
          ← Back to Library
        </Link>
      </main>
    );
  }

  // Ready
  const title = video?.title ?? 'Untitled';
  const description = video?.description ?? '';

  return (
    <main className="mx-auto max-w-4xl p-4">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">{title}</h1>
      </header>

      <section className="mb-6">
        {/* FILE (video) */}
        {video?.media_provider === 'FILE' && (
          <div className="w-full">
            {signedUrl ? (
              <video
                controls
                playsInline
                src={signedUrl}
                className="aspect-video w-full rounded border"
                aria-label={`Video player for ${title}`}
              />
            ) : (
              <div className="aspect-video w-full rounded border p-4 text-center text-sm text-gray-600">
                Generating secure link…
              </div>
            )}
          </div>
        )}

        {/* AUDIO */}
        {video?.media_provider === 'AUDIO' && (
          <div className="w-full">
            {signedUrl ? (
              <audio
                controls
                src={signedUrl}
                className="w-full"
                aria-label={`Audio player for ${title}`}
              />
            ) : (
              <div className="rounded border p-4 text-center text-sm text-gray-600">
                Generating secure link…
              </div>
            )}
          </div>
        )}

        {/* YOUTUBE / VIMEO */}
        {(video?.media_provider === 'YOUTUBE' || video?.media_provider === 'VIMEO') && embedSrc && (
          <div className="aspect-video w-full overflow-hidden rounded border">
            <iframe
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
            <div className="rounded border p-4 text-center text-sm text-red-600">
              Missing embed ID for this provider.
            </div>
          )}
        {(video?.media_provider === 'FILE' || video?.media_provider === 'AUDIO') && !video?.storage_path && (
          <div className="rounded border p-4 text-center text-sm text-red-600">
            Missing storage path for this media.
          </div>
        )}
      </section>

      {description && (
        <section className="prose mb-8 max-w-none">
          <p className="whitespace-pre-wrap text-gray-700">{description}</p>
        </section>
      )}

      <footer className="mt-6">
        <Link
          href={bookHref}
          className="inline-flex items-center gap-2 rounded bg-black px-4 py-2 text-white hover:opacity-90"
          aria-label="Book a session"
        >
          Book session
          <span aria-hidden>→</span>
        </Link>
      </footer>
    </main>
  );
}
