// path: src/app/(authed)/upload/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Upload" };

export default function UploadPage() {
  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold">Upload</h1>
      <p className="mt-2 text-sm">Provider upload placeholder.</p>
    </main>
  );
}
