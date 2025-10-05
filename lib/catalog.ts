// path: lib/catalog.ts
/**
 * lib/catalog.ts
 * Catalog data helpers for topics, providers, and videos (client-side Supabase).
 * Lean selects, minimal return types, graceful empty/error handling.
 */
import { supabase } from './supabase/client'; // keep as-is to match your current export style

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
  pro: boolean;              // <— NEW
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
  pro: boolean;              // <— NEW
  created_at: string;
  // Optional extras
  topic_slug?: string | null;
  thumbnail_url?: string | null;
  duration_sec?: number | null;
  playback_url?: string | null;
};

/** Normalize topic param so "all", "", "null", "undefined" behave as no filter */
function normTopic(t?: string | null): string | undefined {
  if (!t) return undefined;
  const v = t.trim().toLowerCase();
  if (!v || v === 'all' || v === 'null' || v === 'undefined') return undefined;
  return t;
}

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
  const topic = normTopic(topicSlug);

  // No topic filter → list all providers
  if (!topic) {
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
    .eq('slug', topic)
    .single();

  if (topicErr || !topicRow) return [];

  // Get provider ids tagged to this topic
  const { data: tagRows, error: tagErr } = await supabase
    .from('providers_topics')
    .select('provider_id')
    .eq('topic_id', topicRow.id);

  if (tagErr || !tagRows || tagRows.length === 0) return [];

  const providerIds = Array.from(
    new Set(tagRows.map((r) => r.provider_id).filter(Boolean))
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
 * Uses the deduped view `videos_flat` in all cases and returns public by default.
 * Returns [] on error/empty.
 */
export async function listVideos(params: {
  topic?: string;
  providerId?: string;
  onlyPublic?: boolean;
} = {}): Promise<VideoListItem[]> {
  const topic = normTopic(params.topic);
  const { providerId } = params;
  const onlyPublic = params.onlyPublic ?? true;

  let q = supabase
    .from('videos_flat')
    .select('id, title, provider_id, created_at, is_public, pro, topic_slug')
    .order('title', { ascending: true });

  if (topic) q = q.eq('topic_slug', topic);
  if (onlyPublic) q = q.eq('is_public', true);
  if (providerId) q = q.eq('provider_id', providerId);

  const { data, error } = await q;
  if (error || !data) return [];
  // The view is DISTINCT; if you still want belt-and-suspenders de-dupe:
  const seen = new Set<string>();
  return (data as unknown as VideoListItem[]).filter(r =>
    seen.has(r.id) ? false : (seen.add(r.id), true)
  );
}

/**
 * Get a single video by id. Returns null on error/not found.
 * Selects explicit columns and aliases to match the Video type.
 */
export async function getVideo(id: string): Promise<Video | null> {
  if (!id) return null;

  // Shape returned by videos_flat (typed; no `any`)
  type FlatRow = {
    id: string;
    title: string | null;
    description: string | null;
    provider_id: string | number;
    created_at: string;
    is_public: boolean | null;
    pro: boolean | null;
    media_provider?: 'YOUTUBE' | 'VIMEO' | 'FILE' | 'AUDIO';
    embed_id?: string | null;
    storage_path?: string | null;
    duration_seconds?: number | null;
    topic_slug?: string | null;
  };

  const { data, error } = await supabase
    .from('videos_flat')
    .select<
      'id, title, description, provider_id, created_at, is_public, pro, media_provider, embed_id, storage_path, duration_seconds, topic_slug'
    >()
    .eq('id', id)
    .limit(1);

  if (error) return null;

  const rows = (data ?? []) as FlatRow[];
  const row = rows[0];
  if (!row) return null;

  // Build the object your watch page expects (and our Video type tolerates)
  const result: Video = {
    id: row.id,
    title: row.title ?? 'Untitled',
    description: row.description,
    provider_id: String(row.provider_id),
    is_public: !!row.is_public,
    pro: !!row.pro,
    created_at: row.created_at,
    duration_sec: row.duration_seconds ?? null,

    // optional passthroughs for the watch page
    // (keep as extra props; your Video type allows optionals)
    // @ts-expect-error keep extra fields for consumer pages
    media_provider: row.media_provider,
    
    embed_id: row.embed_id ?? null,
   
    storage_path: row.storage_path ?? null,

    // optional extras left null by default
    thumbnail_url: null,
    playback_url: null,
    topic_slug: row.topic_slug ?? null,
  };

  return result;
}

