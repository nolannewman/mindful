// path: src/lib/storage.ts
import { supabase } from './supabase/client';

/**
 * Returns a signed URL for a given Supabase Storage path.
 * @param storagePath Format: "bucket/key/filename"
 * @param seconds     Expiry in seconds (default 3600)
 */
export async function getSignedUrl(
  storagePath: string,
  seconds = 3600
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const firstSlash = storagePath.indexOf('/');
    if (firstSlash === -1) {
      return { ok: false, error: 'Invalid storage path. Expected "bucket/key".' };
    }
    const bucket = storagePath.slice(0, firstSlash);
    const objectPath = storagePath.slice(firstSlash + 1);

    const result = await supabase.storage
      .from(bucket)
      .createSignedUrl(objectPath, seconds);

    if (result.error) {
      return { ok: false, error: result.error.message };
    }
    return { ok: true, url: result.data.signedUrl };
  } catch (e: unknown) {
    const msg =
      e instanceof Error ? e.message : 'Unknown error creating signed URL';
    return { ok: false, error: msg };
  }
}

/**
 * Upload a File/Blob to a bucket under a user-scoped directory.
 * Returns the storage path on success (e.g., "bucket/userId/filename.ext").
 */
export async function uploadMedia(
  bucket: string,
  userId: string,
  file: File
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  try {
    if (!userId) return { ok: false, error: 'Missing user ID' };
    if (!file) return { ok: false, error: 'No file selected' };

    const filename = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const objectPath = `${userId}/${filename}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(objectPath, file, {
        upsert: false,
        cacheControl: '3600',
        contentType: file.type || 'application/octet-stream', // ensure correct playback
      });

    if (error) return { ok: false, error: error.message };
    return { ok: true, path: `${bucket}/${objectPath}` };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error uploading media';
    return { ok: false, error: msg };
  }
}