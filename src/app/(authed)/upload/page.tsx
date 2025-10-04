// path: app/(authed)/upload/page.tsx

// These are server-only route segment configs:
export const prerender = false;
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import UploadClient from './UploadClient';

export default function Page() {
  return <UploadClient />;
}
