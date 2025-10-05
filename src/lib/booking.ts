// lib/booking.ts
// Resolves a Calendly URL based on an optional providerId, falling back to env,
// then to calendly.com so the page always renders something usable.

import { createClient } from '@supabase/supabase-js'

/**
 * Resolve a Calendly scheduling URL.
 * Order of precedence:
 * 1) Provider.calendly_url if providerId is supplied and record exists.
 * 2) NEXT_PUBLIC_CALENDLY_URL env.
 * 3) https://calendly.com (safe global fallback).
 */
export async function resolveCalendlyUrl(providerId?: string): Promise<string> {
  // Initialize Supabase client (browser-safe; public env only)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const canUseSupabase =
    typeof supabaseUrl === 'string' &&
    supabaseUrl.length > 0 &&
    typeof supabaseAnonKey === 'string' &&
    supabaseAnonKey.length > 0

  let providerUrl: string | null = null

  if (providerId && canUseSupabase) {
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey)
      const { data, error } = await supabase
        .from('providers')
        .select('calendly_url')
        .eq('id', providerId)
        .maybeSingle()

      if (!error && data?.calendly_url) {
        providerUrl = data.calendly_url.trim()
      }
    } catch {
      // fallback continues below
    }
  }

  // 2) Environment default (public).
  const envUrl = (process.env.NEXT_PUBLIC_CALENDLY_URL ?? '').trim()

  // 3) Final hard fallback ensures link/iframe always has a valid origin.
  return providerUrl || envUrl || 'https://calendly.com'
}

export default resolveCalendlyUrl
