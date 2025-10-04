// path: src/app/(auth)/login/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Login" };

export default function LoginPage() {
  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold">Login</h1>
      <p className="mt-2 text-sm">Magic link sign-in placeholder.</p>
    </main>
  );
}
