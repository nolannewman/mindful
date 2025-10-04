// path: app/(authed)/upload/page.tsx
'use client';

// Prevent SSG/prerender for this client page so Supabase client only initializes in-browser.
export const prerender = false;

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/../lib/supabase';
import { uploadMedia } from '@/../lib/storage';

type Topic = {
  id: number;
  slug: string;
  name?: string | null;
};

// Simple auth helper: get current user id from Supabase auth (browser)
async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export default function UploadPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState<number[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<'idle' | 'validating' | 'uploading' | 'inserting' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [newVideoId, setNewVideoId] = useState<string | null>(null);

  const acceptAttr = useMemo(() => '.mp4,.m4a,.mp3', []);

  useEffect(() => {
    let active = true;
    (async () => {
      const uid = await getUserId();
      if (!active) return;
      setUserId(uid);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Load topics for selector
  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('topics')
        .select('id, slug, name')
        .order('name', { ascending: true });

      if (!active) return;
      if (error) {
        // non-fatal; allow uploading without topics if table is absent
        setTopics([]);
        return;
      }
      setTopics((data ?? []) as Topic[]);
    })();
    return () => {
      active = false;
    };
  }, []);

  function toggleTopic(id: number) {
    setSelectedTopicIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setStage('validating');

    try {
      if (!userId) throw new Error('You must be logged in to upload.');
      if (!file) throw new Error('Choose a file to upload.');

      // Size constraints (~25MB)
      const MAX = 25 * 1024 * 1024;
      if (file.size > MAX) {
        throw new Error('File is too large. Maximum size is 25 MB.');
      }

      // Basic type constraints
      const allowedNames = ['.mp3', '.m4a', '.mp4'];
      const lowerName = file.name.toLowerCase();
      const mime = file.type || '';
      const okByName = allowedNames.some((ext) => lowerName.endsWith(ext));
      const okByType = mime.startsWith('audio/') || mime.startsWith('video/');
      if (!okByName && !okByType) {
        throw new Error('Unsupported file type. Allowed: .mp3, .m4a, .mp4');
      }

      setStage('uploading');

      // 1) Upload to Storage (two args only)
      const { storage_path } = await uploadMedia(userId as string, file as File);

      setStage('inserting');

      // 2) Insert into videos (schema: media_provider enum, storage_path, optional provider_id)
      const { data: inserted, error: insErr } = await supabase
        .from('videos')
        .insert({
          title: title || file.name.replace(/\.[^/.]+$/, ''),
          description: description || null,
          media_provider: 'FILE',
          embed_id: null,
          storage_path,
          duration_seconds: null,
          provider_id: null, // set to providers.id if you want to attribute
          // published defaults to true, pro defaults to false
        })
        .select('id')
        .single();

      if (insErr) throw insErr;
      const videoId = (inserted as { id: string } | null)?.id;
      if (!videoId) throw new Error('Insert did not return id');

      // 3) Link topics (if any) via videos_topics(topic_id)
      if (selectedTopicIds.length > 0) {
        const rows = selectedTopicIds.map((topic_id) => ({ video_id: videoId, topic_id }));
        const { error: linkErr } = await supabase.from('videos_topics').insert(rows);
        if (linkErr) throw linkErr;
      }

      setNewVideoId(videoId);
      setStage('done');
    } catch (err: unknown) {
      setStage('error');
      const message = (() => {
        if (err instanceof Error) return err.message;
        if (typeof err === 'object' && err && 'message' in err) {
          const m = (err as { message?: unknown }).message;
          if (typeof m === 'string') return m;
        }
        return 'Upload failed';
      })();
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = !!file && !!userId && !busy;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Upload Media</h1>
      <p className="mt-2 text-sm text-gray-500">
        Upload an MP3/MP4/M4A to Supabase Storage. We’ll create a catalog entry and link topics.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-6">
        <div>
          <label className="block text-sm font-medium">File</label>
          <input
            type="file"
            accept={acceptAttr}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-2 block w-full"
            aria-describedby="file-help"
          />
          <p id="file-help" className="mt-2 text-xs text-gray-500">
            Accepted: .mp3, .m4a, .mp4 · Max 25MB
          </p>
          {file && (
            <div className="mt-2 rounded border bg-gray-50 p-2 text-xs">
              <div><span className="font-medium">Name:</span> {file.name}</div>
              <div><span className="font-medium">Size:</span> {(file.size / (1024 * 1024)).toFixed(2)} MB</div>
              <div><span className="font-medium">Type:</span> {file.type || '—'}</div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium">Title</label>
          <input
            className="mt-2 w-full rounded border px-3 py-2"
            placeholder="Optional title (defaults to filename)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Description</label>
          <textarea
            className="mt-2 w-full rounded border px-3 py-2"
            placeholder="Optional short description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <fieldset className="rounded border p-4">
          <legend className="text-sm font-medium">Topics</legend>
          {topics.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">No topics found (you can still upload).</p>
          ) : (
            <ul className="mt-2 grid grid-cols-2 gap-2">
              {topics.map((t) => (
                <li key={t.id} className="flex items-center gap-2">
                  <input
                    id={`topic-${t.id}`}
                    type="checkbox"
                    checked={selectedTopicIds.includes(t.id)}
                    onChange={() => toggleTopic(t.id)}
                  />
                  <label htmlFor={`topic-${t.id}`} className="text-sm">
                    {t.name || t.slug}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </fieldset>

        {/* Progress Indicator (staged) */}
        {busy || stage !== 'idle' ? (
          <div className="rounded bg-gray-50 p-3 text-sm">
            <div className="font-medium">Progress</div>
            <ul className="mt-1 list-disc pl-5">
              <li className={stage !== 'idle' ? 'opacity-100' : 'opacity-50'}>Validating</li>
              <li className={stage === 'uploading' || stage === 'inserting' || stage === 'done' ? 'opacity-100' : 'opacity-50'}>
                Uploading to Storage
              </li>
              <li className={stage === 'inserting' || stage === 'done' ? 'opacity-100' : 'opacity-50'}>
                Inserting video row
              </li>
              <li className={stage === 'done' ? 'opacity-100' : 'opacity-50'}>
                Linking topics
              </li>
            </ul>
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {busy ? 'Uploading…' : 'Upload'}
          </button>
          {error && (
            <span role="alert" className="text-sm text-red-600">
              {error}
            </span>
          )}
        </div>

        {stage === 'done' && newVideoId && (
          <div className="rounded border border-green-200 bg-green-50 p-3">
            <div className="font-medium text-green-800">Success!</div>
            <p className="mt-1 text-sm text-green-800">
              Your media was uploaded and added to your catalog.
            </p>
            <div className="mt-2">
              <a
                href={`/watch/${newVideoId}`}
                className="underline"
                aria-label="Open the new video"
              >
                Go to Watch page →
              </a>
            </div>
          </div>
        )}
      </form>
    </main>
  );
}
