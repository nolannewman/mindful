// path: lib/auth.ts
import { supabase } from './supabase/client';

export type MinimalUser = {
  id: string;
  email?: string | null;
};

export type Profile = {
  id: string;
  display_name: string | null;
  topics_of_interest: string[]; // text[] in DB
};

/**
 * ensureProfile
 * Idempotently creates/updates a profile row in public.users for the authenticated user.
 * - Schema-aware: public.users has (id, display_name, topics_of_interest, created_at)
 * - No role / entitlement columns here (those live in entitlements table).
 * - Provider accounts are seeded separately (not created here).
 */
export async function ensureProfile(user: MinimalUser): Promise<
  | { ok: true; profile: Profile }
  | { ok: false; error: string }
> {
  if (!user?.id) {
    return { ok: false, error: 'Missing user id' };
  }

  // Derive a friendly display_name if none exists — safe default from email local-part.
  const derivedName =
    (user.email?.split('@')?.[0] ?? null) as string | null;

  const payload = {
    id: user.id,
    // Only columns that exist in the provided schema:
    display_name: derivedName,
    topics_of_interest: [] as string[],
  };

  const { data, error } = await supabase
    .from('users')
    .upsert(payload, { onConflict: 'id', ignoreDuplicates: false })
    .select('id, display_name, topics_of_interest')
    .single();

  if (error) {
    return {
      ok: false,
      error:
        'Could not create your profile. If this continues, contact support. (' +
        error.message +
        ')',
    };
  }

  return { ok: true, profile: data as Profile };
}

/**
 * getProfile (read-only)
 * Fetch the current user's profile as defined in the provided schema.
 */
export async function getProfile(userId: string): Promise<
  | { ok: true; profile: Profile }
  | { ok: false; error: string }
> {
  if (!userId) return { ok: false, error: 'Missing user id' };

  const { data, error } = await supabase
    .from('users')
    .select('id, display_name, topics_of_interest')
    .eq('id', userId)
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data) {
    return { ok: false, error: 'Profile not found' };
  }

  return { ok: true, profile: data as Profile };
}

/**
 * getSubscription (read-only, convenience)
 * - Returns current plan and expiration (or defaults to "free").
 */
export async function getSubscription(userId: string): Promise<
  | { ok: true; plan: string; expires_at: string | null }
  | { ok: false; error: string }
> {
  if (!userId) return { ok: false, error: 'Missing user id' };
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('entitlements')
    .select('plan, expires_at')
    .eq('user_id', userId)
    // Active: lifetime OR in the future
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('expires_at', { ascending: true, nullsFirst: true })
    .limit(1);

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data || data.length === 0) {
    return { ok: true, plan: 'free', expires_at: null };
  }

  const row = data[0] as { plan: string | null; expires_at: string | null };
  return {
    ok: true,
    plan: row.plan ?? 'free',
    expires_at: row.expires_at ?? null,
  };
}

/**
 * getUserTopics: returns the current user's topics_of_interest (slugs).
 * Returns [] if not authed or row missing.
 */
export async function getUserTopics(): Promise<string[]> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return [];
  const { data, error } = await supabase
    .from('users')
    .select('topics_of_interest')
    .eq('id', user.id)
    .maybeSingle();
  if (error) return [];
  const topics = (data?.topics_of_interest ?? []) as unknown as string[];
  return Array.isArray(topics) ? topics : [];
}

/**
 * saveUserTopics: upserts the current user's topics_of_interest.
 * Requires RLS update/insert on public.users for owner.
 */
export async function saveUserTopics(topics: string[]): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return { ok: false, error: 'Not authenticated' };
  const payload = { id: user.id, topics_of_interest: topics };
  const { error } = await supabase.from('users').upsert(payload, { onConflict: 'id' });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
