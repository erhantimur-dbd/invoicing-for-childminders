import Link from 'next/link'
import type { Metadata } from 'next'

const URL = 'https://www.godottie.cloud/guides'

export const metadata: Metadata = {
  title: 'Guides for UK childminders',
  description:
    'Plain-English guides on funded hours, invoice rules, HMRC and Making Tax Digital — written for UK childminders, by Dottie.',
  alternates: { canonical: URL },
  openGraph: {
    title: 'Guides for UK childminders — Dottie',
    description:
      'Funded hours, invoice rules, HMRC and MTD — practical guides for UK childminders.',
    url: URL,
    type: 'website',
  },
}

const HUBS = [
  {
    title: 'Funded hours',
    desc: '15h, 30h, the September 2025 expansion, and how to invoice for them correctly.',
    items: [
      {
        href: '/guides/funded-hours/2026-invoice-rules',
        title: 'The 2026 invoice rules',
        desc: 'What must be itemised on every funded-hours invoice from January 2026.',
      },
      {
        href: '/guides/funded-hours/30-hours-9-month-rollout-2025',
        title: '30 hours from 9 months — the September 2025 rollout',
        desc: 'Eligibility, dates, and what childminders need to do for the biggest funded-childcare expansion in a decade.',
      },
    ],
  },
  {
    title: 'HMRC & MTD',
    desc: 'Making Tax Digital for Income Tax kicks in for £50k+ sole traders from April 2026 — and £30k from April 2027.',
    items: [
      {
        href: '/guides/mtd',
        title: 'Making Tax Digital for childminders — the 2026 guide',
        desc: 'Thresholds, quarterly deadlines, and what HMRC requires under the standard approach.',
      },
    ],
  },
  {
    title: 'Running your childminding business',
    desc: 'Setting rates, late payers, expenses you can claim, EYFS 2025. Coming soon.',
    items: [],
  },
]

export default function GuidesIndex() {
  return (
    <div className="bg-white text-gray-900 min-h-screen">
      <header className="border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-amber-400">
              <span className="text-white text-xs font-extrabold">D.</span>
            </span>
            <span className="font-bold text-gray-900 text-sm">Dottie</span>
          </Link>
          <Link
            href="/signup"
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
          >
            Start free trial →
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <p className="text-emerald-700 text-xs font-semibold uppercase tracking-widest mb-3">
          Guides
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
          Plain-English guides for UK childminders
        </h1>
        <p className="text-gray-600 text-lg leading-relaxed mb-12">
          The rules around funded hours, invoicing, and HMRC change quickly. We write the answers down so you don&apos;t have to wade through GOV.UK every term.
        </p>

        <div className="space-y-10">
          {HUBS.map((hub) => (
            <section key={hub.title}>
              <h2 className="text-xl font-bold text-gray-900 mb-1">{hub.title}</h2>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">{hub.desc}</p>
              {hub.items.length > 0 ? (
                <ul className="space-y-2">
                  {hub.items.map((it) => (
                    <li key={it.href}>
                      <Link
                        href={it.href}
                        className="block rounded-xl border border-gray-200 hover:border-emerald-300 hover:shadow-sm p-4 transition-colors"
                      >
                        <p className="font-semibold text-gray-900">{it.title}</p>
                        <p className="text-gray-500 text-sm leading-relaxed">{it.desc}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-400 text-sm italic">More guides coming soon.</p>
              )}
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}
