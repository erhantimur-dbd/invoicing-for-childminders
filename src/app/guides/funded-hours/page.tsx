import Link from 'next/link'
import type { Metadata } from 'next'

const URL = 'https://www.godottie.cloud/guides/funded-hours'

export const metadata: Metadata = {
  title: 'Funded childcare hours: the childminder\'s guide',
  description:
    'Everything UK childminders need to know about 15-hour and 30-hour funded entitlements, the September 2025 expansion to 9-month-olds, and how to invoice for them.',
  alternates: { canonical: URL },
  openGraph: {
    title: 'Funded childcare hours — guides for UK childminders',
    description:
      '15h, 30h, the 2024–25 expansion, and how to invoice for them correctly.',
    url: URL,
    type: 'website',
  },
}

const ITEMS = [
  {
    href: '/guides/funded-hours/2026-invoice-rules',
    title: 'The 2026 invoice rules: what must be itemised',
    desc: 'From January 2026 every funded-hours invoice must split funded hours, paid hours, food, consumables, and activities. With a worked example and a free compliant template.',
    badge: 'Updated for 2026',
  },
  {
    href: '/guides/funded-hours/30-hours-9-month-rollout-2025',
    title: '30 funded hours from 9 months — the September 2025 rollout',
    desc: 'How the biggest funded-childcare expansion in a decade works — eligibility, dates, and what childminders should do to prepare.',
    badge: null,
  },
]

export default function FundedHoursIndex() {
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
        <nav aria-label="Breadcrumb" className="text-sm text-gray-500 mb-6">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li><Link href="/" className="hover:text-emerald-700">Home</Link></li>
            <li aria-hidden>/</li>
            <li><Link href="/guides" className="hover:text-emerald-700">Guides</Link></li>
            <li aria-hidden>/</li>
            <li><span className="text-gray-900 font-medium">Funded hours</span></li>
          </ol>
        </nav>

        <p className="text-emerald-700 text-xs font-semibold uppercase tracking-widest mb-3">
          Funded hours
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
          Funded childcare hours: the childminder&apos;s guide
        </h1>
        <p className="text-gray-600 text-lg leading-relaxed mb-10">
          The September 2025 expansion put 30 funded hours from age 9 months into reach for working parents, and the 2026 invoice rules tightened up how childminders must itemise the bill. This is the index of our funded-hours guides.
        </p>

        <ul className="space-y-3">
          {ITEMS.map((it) => (
            <li key={it.href}>
              <Link
                href={it.href}
                className="block rounded-xl border border-gray-200 hover:border-emerald-300 hover:shadow-sm p-5 transition-colors"
              >
                {it.badge && (
                  <span className="inline-block mb-2 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
                    {it.badge}
                  </span>
                )}
                <p className="font-semibold text-gray-900 mb-1">{it.title}</p>
                <p className="text-gray-500 text-sm leading-relaxed">{it.desc}</p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}
