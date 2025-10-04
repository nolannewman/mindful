// path: lib/auth.ts
import { supabase } from './supabase';

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
    // topics_of_interest has a DEFAULT '{}', but including an empty value on upsert is safe.
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
  const { data, error } = await supabase
    .from('users')
    .select('id, display_name, topics_of_interest')
    .eq('id', userId)
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, profile: data as Profile };
}

/**
 * getCurrentEntitlement
 * Reads the user's current/active entitlement from public.entitlements.
 * - Active = expires_at IS NULL (lifetime) OR expires_at > now().
 * - Returns the most relevant active row (NULL expires first, otherwise earliest expiry).
 * - If none, returns plan 'free'.
 */
export async function getCurrentEntitlement(userId: string): Promise<
  | { ok: true; plan: string; expires_at: string | null }
  | { ok: false; error: string }
> {
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
