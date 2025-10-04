import { supabase } from './supabase';
export async function ensureProfile(user: { id: string; email?: string|null }) {
  if (!user?.id) return;
  await supabase.from('users').upsert({ id: user.id, email: user.email ?? null });
}
