// path: lib/catalog.ts
/**
 * lib/catalog.ts
 * Catalog data helpers for topics, providers, and videos (client-side Supabase).
 * Lean selects, minimal return types, graceful empty/error handling.
 */
import { supabase } from './supabase';

// Minimal types (no `any`).
export type Topic = {
  id: string;
  slug: string;
  name: string;
};

export type Provider = {
  id: string;
  name: string;
  calendly_url: string | null;
};

export type VideoListItem = {
  id: string;
  title: string;
  provider_id: string;
  is_public: boolean;
  created_at: string;
  // Optional/derived light fields if present in schema; tolerated if absent at runtime.
  thumbnail_url?: string | null;
  topic_slug?: string | null;
};

export type Video = {
  id: string;
  title: string;
  description: string | null;
  provider_id: string;
  is_public: boolean;
  created_at: string;
  // Optional extras commonly seen in simple schemas.
  topic_slug?: string | null;
  thumbnail_url?: string | null;
  duration_sec?: number | null;
  playback_url?: string | null;
};

/**
 * List all topics ordered by name.
 * Returns [] on error/empty.
 */
export async function listTopics(): Promise<Topic[]> {
  const { data, error } = await supabase
    .from('topics')
    .select('id, slug, name')
    .order('name', { ascending: true });

  if (error || !data) return [];
  return data as Topic[];
}

/**
 * List providers. If topicSlug is provided, only providers that have videos in that topic.
 * Returns [] on error/empty.
 */
export async function listProviders(topicSlug?: string): Promise<Provider[]> {
  // Fast path: no filter → single lean select.
  if (!topicSlug) {
    const { data, error } = await supabase
      .from('providers')
      .select('id, name, calendly_url')
      .order('name', { ascending: true });

    if (error || !data) return [];
    return data as Provider[];
  }

  // With topic filter → two-step: find distinct provider_ids from videos, then fetch providers.
  const vids = await supabase
    .from('videos')
    .select('provider_id')
    .eq('topic_slug', topicSlug);

  if (vids.error || !vids.data || vids.data.length === 0) return [];

  const ids = Array.from(new Set(vids.data.map((v: { provider_id: string }) => v.provider_id))).filter(Boolean);
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from('providers')
    .select('id, name, calendly_url')
    .in('id', ids)
    .order('name', { ascending: true });

  if (error || !data) return [];
  return data as Provider[];
}

/**
 * List videos with optional topic/provider filters.
 * Defaults to only public videos.
 * Returns [] on error/empty.
 */
export async function listVideos(params: {
  topic?: string;
  providerId?: string;
  onlyPublic?: boolean;
} = {}): Promise<VideoListItem[]> {
  const { topic, providerId, onlyPublic = true } = params;

  let query = supabase
    .from('videos')
    .select('id, title, provider_id, is_public, created_at, thumbnail_url, topic_slug')
    .order('created_at', { ascending: false });

  if (onlyPublic) {
    query = query.eq('is_public', true);
  }
  if (topic) {
    // By convention use `topic_slug`; safe no-op if column absent at runtime.
    query = query.eq('topic_slug', topic);
  }
  if (providerId) {
    query = query.eq('provider_id', providerId);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as VideoListItem[];
}

/**
 * Get a single video by id. Returns null on error/not found.
 * Selects all columns to satisfy watch pages that may need full payload.
 */
export async function getVideo(id: string): Promise<Video | null> {
  if (!id) return null;

  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data as Video;
}
