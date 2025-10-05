// path: src/app/(authed)/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/../lib/supabaseServer';

type Profile = {
  id: string;
  display_name: string | null;
  topics_of_interest: string[];
};

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login'); // middleware should gate already; this is belt & suspenders

  const { data: profileData, error, status } = await supabase
    .from('users')
    .select('id, display_name, topics_of_interest')
    .eq('id', user.id)
    .maybeSingle();

  if (error && (status === 401 || status === 403)) {
    throw new Error('RLS blocked profile read; check policies and SSR cookies.');
  }

  let profile = profileData as Profile | null;

  if (!profile) {
    const seed: Profile = {
      id: user.id,
      display_name: user.email?.split('@')[0] ?? null,
      topics_of_interest: [],
    };
    const { error: upsertErr } = await supabase.from('users').upsert(seed);
    if (upsertErr) throw upsertErr;
    profile = seed;
  }

  // If you want onboarding for empty interests, redirect there instead of blocking access:
  // if (profile.topics_of_interest.length === 0) redirect('/onboarding');

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-gray-700">
        Welcome{profile.display_name ? `, ${profile.display_name}` : ''}.
      </p>
    </main>
  );
}
