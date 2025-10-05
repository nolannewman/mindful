// path: src/app/(authed)/upload/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { uploadMedia } from '@/lib/storage';

type Topic = { id: number; name: string };

type VideoRow = { id: string };

const ACCEPT = '.mp4,.m4a,.mp3';
const MAX_MB = 25;
const MAX_BYTES = MAX_MB * 1024 * 1024;
const BUCKET = 'media';

export default function UploadPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<number[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  // Load topics
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('topics')
        .select('id,name')
        .order('name', { ascending: true })
        .returns<Topic[]>();

      if (error) {
        setError(error.message);
      } else {
        setTopics(data ?? []);
      }
    })();
  }, []);

  const onSelectTopics = (id: number, checked: boolean) => {
    setSelectedTopics((prev) =>
      checked ? [...new Set([...prev, id])] : prev.filter((t) => t !== id)
    );
  };

  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    setError(null);
    const f = e.target.files?.[0] ?? null;
    if (!f) {
      setFile(null);
      return;
    }
    if (f.size > MAX_BYTES) {
      setError(`File too large. Max ${MAX_MB}MB.`);
      return;
    }
    const lower = f.name.toLowerCase();
    if (!ACCEPT.split(',').some((ext) => lower.endsWith(ext))) {
      setError(`Unsupported file type. Allowed: ${ACCEPT}`);
      return;
    }
    setFile(f);
    // Default title to filename (without extension) if empty
    if (!title) {
      const base = f.name.replace(/\.[^/.]+$/, '');
      setTitle(base);
    }
  };

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setError(null);
    setToast(null);
    setSuccessId(null);
    setProgress(10);

    if (!file) {
      setError('Please choose a file.');
      return;
    }
    if (!title.trim()) {
      setError('Please provide a title.');
      return;
    }

    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user) throw new Error('Authentication required.');

      // 1) Upload to Supabase Storage
      setProgress(40);
      const upload = await uploadMedia(BUCKET, user.id, file);
      if (!upload.ok) throw new Error(upload.error);

      // 2) Insert video (schema: videos has media_provider + storage_path + published/pro)
      //    Note: provider_id is nullable; we can omit it for FILE uploads.
      setProgress(70);
      const { data: rows, error: vErr } = await supabase
        .from('videos')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          media_provider: 'FILE',
          storage_path: upload.path,
          published: true,
          pro: false,
        })
        .select('id')
        .returns<VideoRow[]>(); // array response

      if (vErr) throw new Error(vErr.message);
      const newId = rows?.[0]?.id;
      if (!newId) throw new Error('Insert succeeded but no id was returned.');

      // 3) Link topics (videos_topics expects bigint topic_id + uuid video_id)
      if (selectedTopics.length > 0) {
        const linkRows = selectedTopics.map((topic_id) => ({
          video_id: newId,
          topic_id,
        }));
        const { error: linkErr } = await supabase
          .from('videos_topics')
          .insert(linkRows);
        if (linkErr) throw new Error(linkErr.message);
      }

      setProgress(100);
      setSuccessId(newId);
      setToast('Upload complete!');
    } catch (err: unknown) {
      setProgress(null);
      setSuccessId(null);
      const message = err instanceof Error ? err.message : 'Upload failed.';
      setError(message);
    }
  };

  return (
    <main className="max-w-xl mx-auto p-6" aria-labelledby="upload-title">
      <h1 id="upload-title" className="text-2xl font-semibold">Upload</h1>

      <form onSubmit={onSubmit} className="mt-6 space-y-6">
        <div>
          <label htmlFor="file" className="block text-sm font-medium">
            Media file
          </label>
          <input
            id="file"
            name="file"
            type="file"
            accept={ACCEPT}
            onChange={onFileChange}
            className="mt-2 block w-full rounded border p-2"
          />
          <p className="mt-1 text-xs">
            Accepts {ACCEPT.replaceAll('.', '')}. Max size {MAX_MB}MB.
          </p>
          {file && (
            <p className="mt-1 text-xs">
              Selected: <span className="font-mono">{file.name}</span> (
              {(file.size / (1024 * 1024)).toFixed(1)} MB)
            </p>
          )}
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium">
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-2 block w-full rounded border p-2"
            placeholder="Enter a title"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium">
            Description (optional)
          </label>
          <textarea
            id="description"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-2 block w-full rounded border p-2"
            rows={3}
            placeholder="Add a short description"
          />
        </div>

        <div>
          <span className="block text-sm font-medium">Topics</span>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {topics.length === 0 ? (
              <p className="text-sm italic col-span-2">No topics found.</p>
            ) : (
              topics.map((t) => (
                <label key={t.id} className="flex items-center gap-2 rounded border p-2">
                  <input
                    type="checkbox"
                    aria-label={t.name}
                    checked={selectedTopics.includes(t.id)}
                    onChange={(e) => onSelectTopics(t.id, e.target.checked)}
                  />
                  <span className="text-sm">{t.name}</span>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!file || progress !== null}
            className="rounded bg-black text-white px-4 py-2 disabled:opacity-50"
          >
            {progress === null ? 'Upload' : 'Uploading...'}
          </button>

          {progress !== null && (
            <div className="flex-1">
              <div
                className="w-full h-2 rounded bg-gray-200 overflow-hidden"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
                aria-label="Upload progress"
                title={`Uploading ${progress}%`}
              >
                <div
                  className="h-2"
                  style={{ width: `${progress}%`, transition: 'width 0.3s linear' }}
                />
              </div>
              <p className="text-xs mt-1">{progress}%</p>
            </div>
          )}
        </div>

        {error && (
          <div
            className="rounded border border-red-300 bg-red-50 text-red-700 p-3 text-sm"
            role="alert"
          >
            {error}
          </div>
        )}

        {toast && successId && (
          <div
            className="rounded border border-green-300 bg-green-50 text-green-700 p-3 text-sm"
            role="status"
          >
            {toast}{' '}
            <Link className="underline" href={`/watch/${successId}`}>
              View video
            </Link>
          </div>
        )}
      </form>
    </main>
  );
}
