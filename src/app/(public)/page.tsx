// path: app/(public)/page.tsx
'use client';

import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="relative">
      {/* HERO */}
      <section className="hero-gradient hero-glow">
        <div className="container-page pt-16 sm:pt-24 pb-16">
          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-5xl font-semibold leading-tight tracking-tight">
              Fall asleep faster. Wake up restored.
            </h1>
            <p className="mt-4 text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-xl">
              Sleep Trance connects you with professional hypnotherapy content tailored to common sleep challenges—built to calm your mind and deepen your rest.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="btn-primary">Get Started</Link>
              {/* Hash link stays an <a> since it’s an in-page jump */}
              <a href="#how-it-works" className="btn-ghost">How it works</a>
            </div>

            {/* Subtle legal note */}
            <p className="mt-3 text-xs text-gray-500 max-w-xl">
              Sleep Trance partners with hypnotherapists. We do not provide medical care and our content is not a substitute for professional medical advice.
            </p>
          </div>
        </div>
      </section>

      {/* BENEFITS / PILLARS */}
      <section className="container-page py-12 grid sm:grid-cols-3 gap-4">
        {[
          { t: 'Drift off faster', d: 'Guided inductions to reduce mental chatter and ease sleep onset.' },
          { t: 'Stay asleep longer', d: 'Audio sessions designed to retrain unhelpful nighttime patterns.' },
          { t: 'Wake up clearer', d: 'Restore focus and mood with consistent, gentle practice.' },
        ].map((c, i) => (
          <div key={i} className="card card-hover p-6">
            <h3 className="font-semibold">{c.t}</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{c.d}</p>
          </div>
        ))}
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="container-page py-12">
        <div className="grid md:grid-cols-2 gap-6 items-center">
          <div className="card p-6">
            <ol className="space-y-3 text-sm">
              <li><span className="font-medium">1.</span> Create an account</li>
              <li><span className="font-medium">2.</span> Pick your top sleep challenge</li>
              <li><span className="font-medium">3.</span> Get a tailored session in seconds</li>
            </ol>
            <Link href="/login" className="btn-primary mt-6 inline-flex">Start free</Link>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-300">
            Sessions are crafted by hypnotherapy professionals. Try a free track—upgrade any time. If you need clinical guidance, consult a licensed medical provider.
          </div>
        </div>
      </section>

      {/* DISCOVER / ROUTE CTAs */}
      <section className="container-page pb-16">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="card p-6">
            <h3 className="font-semibold">Explore the Library</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Browse publicly available sessions and see what fits your routine.
            </p>
            <Link href="/library" className="btn-ghost mt-4 inline-flex">Open Library</Link>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold">Meet Providers</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Learn more about the hypnotherapists contributing content.
            </p>
            <Link href="/providers" className="btn-ghost mt-4 inline-flex">View Providers</Link>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold">Ready to begin?</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Create an account and start your first guided session.
            </p>
            <Link href="/login" className="btn-primary mt-4 inline-flex">Sign up / Log in</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
