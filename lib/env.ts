export function assertEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`[env] Missing ${name}. Did you set it in .env.local / Vercel?`);
  }
  return v;
}
export const SUPABASE_URL = assertEnv('NEXT_PUBLIC_SUPABASE_URL');
export const SUPABASE_ANON = assertEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
export const CALENDLY_URL = assertEnv('NEXT_PUBLIC_CALENDLY_URL');
