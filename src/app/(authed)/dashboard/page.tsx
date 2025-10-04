// path: src/app/(authed)/dashboard/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-sm">Authed dashboard placeholder.</p>
    </main>
  );
}
