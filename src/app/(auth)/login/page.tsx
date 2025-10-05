'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';

function safeRedirect(raw: string | null): string {
  if (typeof window === 'undefined') return '/dashboard';
  try {
    const u = new URL(raw || '/dashboard', window.location.origin);
    let path = u.pathname + u.search + u.hash;
    if (!path.startsWith('/')) path = '/' + path;
    if (path === '/' || path.startsWith('/auth') || path.startsWith('/login')) return '/dashboard';
    return path;
  } catch {
    return '/dashboard';
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);

    const sp = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const redirect = safeRedirect(sp?.get('redirect') ?? null);
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    const emailRedirectTo = `${base}/auth/callback?redirect=${encodeURIComponent(redirect)}`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo, shouldCreateUser: true },
    });

    setBusy(false);
    if (error) { setErr(error.message); return; }
    setSent(true);
  };

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="text-xl font-semibold mb-4">Sign in with a magic link</h1>
      {sent ? (
        <div className="space-y-3">
          <p>We sent a sign-in link to <strong>{email}</strong>. Open it on this device.</p>
          <button className="rounded px-3 py-2 border" onClick={() => setSent(false)}>Use a different email</button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block">
            <span>Email</span>
            <input className="w-full rounded border px-3 py-2" type="email" required
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {err && <p className="text-red-600 text-sm">{err}</p>}
          <button type="submit" disabled={busy} className="w-full rounded px-4 py-2 border">
            {busy ? 'Sending…' : 'Send magic link'}
          </button>
        </form>
      )}
    </main>
  );
}
