// path: src/app/book/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Book" };

export default function BookPage() {
  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold">Book</h1>
      <p className="mt-2 text-sm">Calendly embed placeholder.</p>
    </main>
  );
}
