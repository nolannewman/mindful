// path: lib/storage.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// If your project already exposes a browser client elsewhere (e.g. lib/supabase-browser),
// feel free to switch this import to that module. Kept local here for minimal coupling.
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * Normalize and slugify a filename component.
 */
function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function inferFolderByMime(type: string): 'audio' | 'video' {
  if (type.startsWith('audio/')) return 'audio';
  return 'video';
}

function getExtension(file: File): string {
  const nameExt = file.name.split('.').pop() || '';
  if (nameExt) return nameExt.toLowerCase();
  if (file.type === 'audio/mpeg') return 'mp3';
  if (file.type === 'audio/mp4') return 'm4a';
  if (file.type === 'video/mp4') return 'mp4';
  return 'bin';
}

/**
 * Upload an end-user-provided media file (MP3/MP4/M4A) to the "media" bucket.
 * Returns the object path you can save in your DB (e.g. videos.storage_path).
 *
 * - Bucket: "media" (make it PRIVATE; use signed URLs for playback)
 * - Path:   <audio|video>/<userId>/<yyyy-mm>/<slug>-<ts>.<ext>
 */
export async function uploadMedia(
  userId: string,
  file: File
): Promise<{ storage_path: string }> {
  if (!userId) throw new Error('Missing userId for upload');
  if (!file) throw new Error('No file provided');

  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const ts = now.getTime();

  const base = slugify(file.name.replace(/\.[^/.]+$/, '') || 'media');
  const ext = getExtension(file);
  const folder = inferFolderByMime(file.type);

  const storage_path = `${folder}/${userId}/${yyyy}-${mm}/${base}-${ts}.${ext}`;

  // NOTE: If you prefer a different bucket name, change here.
  const { error } = await supabase.storage.from('media').upload(storage_path, file, {
    upsert: false,
    cacheControl: '3600',
    contentType: file.type || (ext === 'mp3' ? 'audio/mpeg' : 'video/mp4'),
  });

  if (error) {
    // Surface a friendlier error if the object exists already
    if (String(error.message || '').toLowerCase().includes('duplicate')) {
      throw new Error('A file with this name already exists. Try renaming the file and retry.');
    }
    throw error;
  }

  return { storage_path };
}

/**
 * Returns a signed URL for a given Supabase Storage path.
 * @param storagePath Format: "bucket/key/filename"
 * @param seconds     Expiry in seconds (default 3600)
 */
export async function getSignedUrl(storagePath: string, seconds = 3600): Promise<
  | { ok: true; url: string }
  | { ok: false; error: string }
> {
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
    // Only use the URL to avoid unused variables lint warnings
    return { ok: true, url: result.data.signedUrl };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error creating signed URL';
    return { ok: false, error: msg };
  }
}

export default supabase;

