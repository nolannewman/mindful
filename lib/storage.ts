import { supabase } from './supabase';
export async function getSignedUrl(storagePath: string, seconds = 3600) {
  const [bucket, ...keyParts] = storagePath.split('/');
  const key = keyParts.join('/');
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(key, seconds);
  if (error || !data?.signedUrl) throw error ?? new Error('No signed URL');
  return data.signedUrl;
}
export async function uploadMedia(userId: string, file: File) {
  const bucket = 'media';
  const key = `${userId}/${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage.from(bucket).upload(key, file, { upsert: false });
  if (error) throw error;
  return { storage_path: `${bucket}/${key}` };
}
