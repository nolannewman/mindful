// path: src/app/watch/[id]/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Watch" };

type Params = { id: string };

export default function WatchPage({ params }: { params: Params }) {
  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold">Watch</h1>
      <p className="mt-2 text-sm">Video ID: <span className="font-mono">{params.id}</span></p>
    </main>
  );
}
