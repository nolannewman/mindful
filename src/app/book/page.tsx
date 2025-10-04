// app/book/page.tsx
import type { Metadata } from 'next'
import resolveCalendlyUrl from '@/../lib/booking'

export const metadata: Metadata = {
  title: 'Book a session',
  description: 'Schedule your session via Calendly.',
}

type SearchParams =
  | { [key: string]: string | string[] | undefined }
  | undefined

function firstParam(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined
  return Array.isArray(value) ? value[0] : value
}

export default async function BookPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const providerId = firstParam(searchParams?.provider)
  const url = await resolveCalendlyUrl(providerId)

  // Make an embeddable src. Calendly supports direct page embedding.
  // We keep it simple & stable. Extra params are optional and safe.
  const embedUrl =
    url +
    (url.includes('?') ? '&' : '?') +
    'hide_gdpr_banner=1&background_color=ffffff'

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Book a session</h1>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4"
          aria-label="Open Calendly in a new tab"
          title="Open Calendly in a new tab"
        >
          Open in new tab
        </a>
      </header>

      <p className="mb-4 text-sm text-gray-500">
        Calendly sends your meeting link by email.
      </p>

      {/* Stable-height, responsive-width container */}
      <div className="w-full min-h-[760px] rounded border">
        <iframe
          title="Calendly Scheduling"
          src={embedUrl}
          className="h-full w-full rounded"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </main>
  )
}
