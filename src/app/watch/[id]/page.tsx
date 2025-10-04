// src/app/watch/[id]/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { getVideo } from '@/../lib/catalog';
import { getSignedUrl } from '@/../lib/storage';

type MediaProvider = 'YOUTUBE' | 'VIMEO' | 'FILE' | 'AUDIO';

type Video = {
  id: string;
  title: string | null;
  description: string | null;
  media_provider: MediaProvider;
  embed_id: string | null;
  storage_path: string | null;
  provider_id: string | null;
  created_at?: string | null;
};

type PageProps = {
  params: { id: string };
};

export default function WatchPage({ params }: PageProps) {
  const { id } = params;
  const [video, setVideo] = useState<Video | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'notfound' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Build provider-specific embed src
  const embedSrc = useMemo(() => {
    if (!video) return null;
    if (video.media_provider === 'YOUTUBE' && video.embed_id) {
      // No autoplay parameter
      return `https://www.youtube.com/embed/${encodeURIComponent(video.embed_id)}?rel=0`;
    }
    if (video.media_provider === 'VIMEO' && video.embed_id) {
      // No autoplay parameter
      return `https://player.vimeo.com/video/${encodeURIComponent(video.embed_id)}`;
    }
    return null;
  }, [video]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setStatus('loading');
        setError(null);
        setSignedUrl(null);

        const v = (await getVideo(id)) as Video | null;

        if (cancelled) return;

        if (!v) {
          setStatus('notfound');
          return;
        }

        setVideo(v);

        if ((v.media_provider === 'FILE' || v.media_provider === 'AUDIO') && v.storage_path) {
          try {
            const url = await getSignedUrl(v.storage_path, 3600);
            if (!cancelled) setSignedUrl(url);
          } catch (e) {
            if (!cancelled) {
              setError('Could not generate a secure media URL.');
            }
          }
        }

        if (!cancelled) setStatus('ready');
      } catch (e) {
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

  const providerQuery = video?.provider_id ? (`?provider=${encodeURIComponent(video.provider_id)}` as const) : ('' as const);
  const bookHref = (`/book${providerQuery}` as unknown) as Route;

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

  // Not found state
  if (status === 'notfound') {
    return (
      <main className="mx-auto max-w-2xl p-6 text-center">
        <h1 className="mb-2 text-2xl font-semibold">Video not found</h1>
        <p className="mb-6 text-gray-600">The video you’re looking for doesn’t exist or isn’t available.</p>
        <Link href="/" className="inline-block rounded border px-4 py-2 text-sm hover:bg-gray-50" aria-label="Go back to library">
          ← Back to Library
        </Link>
      </main>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <main className="mx-auto max-w-2xl p-6 text-center">
        <h1 className="mb-2 text-2xl font-semibold">Unable to load</h1>
        <p className="mb-6 text-gray-600">{error ?? 'Please try again later.'}</p>
        <Link href="/" className="inline-block rounded border px-4 py-2 text-sm hover:bg-gray-50" aria-label="Go back to library">
          ← Back to Library
        </Link>
      </main>
    );
  }

  // Ready state
  const title = video?.title ?? 'Untitled';
  const description = video?.description ?? '';

  return (
    <main className="mx-auto max-w-4xl p-4">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">{title}</h1>
      </header>

      <section className="mb-6">
        {video?.media_provider === 'FILE' && (
          <div className="w-full">
            {signedUrl ? (
              <video
                controls
                playsInline
                // Important: do not set autoPlay
                src={signedUrl}
                className="aspect-video w-full rounded border"
                aria-label={`Video player for ${title}`}
              />
            ) : (
              <div className="aspect-video w-full rounded border p-4 text-center text-sm text-gray-600">Generating secure link…</div>
            )}
          </div>
        )}

        {video?.media_provider === 'AUDIO' && (
          <div className="w-full">
            {signedUrl ? (
              <audio
                controls
                // Important: do not set autoPlay
                src={signedUrl}
                className="w-full"
                aria-label={`Audio player for ${title}`}
              />
            ) : (
              <div className="rounded border p-4 text-center text-sm text-gray-600">Generating secure link…</div>
            )}
          </div>
        )}

        {(video?.media_provider === 'YOUTUBE' || video?.media_provider === 'VIMEO') && embedSrc && (
          <div className="aspect-video w-full overflow-hidden rounded border">
            <iframe
              title={`${title} — ${video.media_provider} player`}
              src={embedSrc}
              loading="lazy"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              // No autoplay allowance
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              // Sandboxed iframe
              sandbox="allow-scripts allow-same-origin allow-presentation"
              className="h-full w-full"
            />
          </div>
        )}

        {/* Fallback if media cannot be rendered */}
        {!embedSrc &&
          (video?.media_provider === 'YOUTUBE' || video?.media_provider === 'VIMEO') &&
          !video?.embed_id && (
            <div className="rounded border p-4 text-center text-sm text-red-600">Missing embed ID for this provider.</div>
          )}
        {(video?.media_provider === 'FILE' || video?.media_provider === 'AUDIO') && !video?.storage_path && (
          <div className="rounded border p-4 text-center text-sm text-red-600">Missing storage path for this media.</div>
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
