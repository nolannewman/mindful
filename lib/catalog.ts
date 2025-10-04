// path: lib/catalog.ts
/**
 * lib/catalog.ts
 * Catalog data helpers for topics, providers, and videos (client-side Supabase).
 * Lean selects, minimal return types, graceful empty/error handling.
 */
import { supabase } from './supabase'; // keep as-is to match your current export style

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
  // Optional/derived fields
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
  // Optional extras
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
  return data as unknown as Topic[];
}

/**
 * List providers.
 * If topicSlug is provided, return providers tagged to that topic (providers_topics),
 * so providers can be discovered before uploading any videos.
 * Returns [] on error/empty.
 */
export async function listProviders(topicSlug?: string): Promise<Provider[]> {
  // No topic filter → list all providers
  if (!topicSlug) {
    const { data, error } = await supabase
      .from('providers')
      .select('id, name, calendly_url')
      .order('name', { ascending: true });

    if (error || !data) return [];
    return data as unknown as Provider[];
  }

  // Resolve topic id from slug
  const { data: topicRow, error: topicErr } = await supabase
    .from('topics')
    .select('id')
    .eq('slug', topicSlug)
    .single();

  if (topicErr || !topicRow) return [];

  // Get provider ids tagged to this topic
  const { data: tagRows, error: tagErr } = await supabase
    .from('providers_topics')
    .select('provider_id')
    .eq('topic_id', topicRow.id);

  if (tagErr || !tagRows || tagRows.length === 0) return [];

  const providerIds = Array.from(
    new Set(tagRows.map(r => r.provider_id).filter(Boolean))
  ) as string[];

  if (providerIds.length === 0) return [];

  // Fetch provider records
  const { data, error } = await supabase
    .from('providers')
    .select('id, name, calendly_url')
    .in('id', providerIds)
    .order('name', { ascending: true });

  if (error || !data) return [];
  return data as unknown as Provider[];
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

  // Topic filter → use flattened view that already exposes created_at + is_public
  if (topic) {
    let query = supabase
      .from('videos_flat')
      .select('id, title, provider_id, created_at, is_public, topic_slug')
      .eq('topic_slug', topic)
      .order('title', { ascending: true });

    if (onlyPublic) query = query.eq('is_public', true);
    if (providerId) query = query.eq('provider_id', providerId);

    const { data, error } = await query;
    if (error || !data) return [];
    return data as unknown as VideoListItem[];
  }

  // No topic filter → query base table, alias published → is_public
  let base = supabase
    .from('videos')
    .select('id, title, provider_id, created_at, published:is_public')
    .order('title', { ascending: true });

  if (onlyPublic) base = base.eq('published', true);
  if (providerId) base = base.eq('provider_id', providerId);

  const { data, error } = await base;
  if (error || !data) return [];
  return data as unknown as VideoListItem[];
}

/**
 * Get a single video by id. Returns null on error/not found.
 * Selects explicit columns and aliases to match the Video type.
 */
export async function getVideo(id: string): Promise<Video | null> {
  if (!id) return null;

  // Prefer the base table for full payload; alias published → is_public.
  // duration_seconds maps onto optional duration_sec at call sites as needed.
  const { data, error } = await supabase
    .from('videos')
    .select(`
      id,
      title,
      description,
      provider_id,
      created_at,
      published:is_public,
      media_provider,
      embed_id,
      storage_path,
      duration_seconds
    `)
    .eq('id', id)
    .single();

  if (error || !data) return null;

  // Optionally project duration_seconds → duration_sec for convenience
  const v = data as unknown as {
    id: string;
    title: string;
    description: string | null;
    provider_id: string;
    created_at: string;
    is_public: boolean;
    duration_seconds?: number | null;
  };

  const projected: Video = {
    id: v.id,
    title: v.title,
    description: v.description,
    provider_id: v.provider_id,
    is_public: (v).is_public,
    created_at: v.created_at,
    duration_sec: v.duration_seconds ?? null,
    // topic_slug/thumbnail_url/playback_url are optional and can be filled by UI adapters if needed.
  };

  return projected;
}
