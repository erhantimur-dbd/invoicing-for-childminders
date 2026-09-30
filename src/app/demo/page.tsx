import Link from 'next/link'
import type { Metadata } from 'next'

const URL = 'https://www.godottie.cloud/demo'

// Google Calendar appointment schedule, embeddable form (?gv=true renders the
// booking grid without the surrounding Google chrome). Swap this constant if
// the schedule ever changes.
const BOOKING_URL =
  'https://calendar.google.com/calendar/appointments/schedules/AcZssZ3YyC0MdetkFG4rIFUnLXzOl3qrgkDtTd10pHbX9FXby20t7dwSSTrvOZZlp7CgN8Osiov7VQcV'
const EMBED_URL = `${BOOKING_URL}?gv=true`

export const metadata: Metadata = {
  title: 'Book a demo',
  description:
    'Book a free 1:1 demo of Dottie — automated invoicing for UK childminders. Pick a time that suits you and we&apos;ll walk you through it.',
  alternates: { canonical: URL },
  openGraph: {
    title: 'Book a demo — Dottie',
    description: 'Pick a time and we&apos;ll show you how Dottie puts your childminding invoices on autopilot.',
    url: URL,
    type: 'website',
  },
}

export default function DemoPage() {
  return (
    <div className="bg-[#fdf8f1] min-h-screen">
      {/* Nav */}
      <header className="border-b border-gray-100 bg-white/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-amber-400 shadow-md">
              <span className="text-white text-base font-extrabold leading-none">D.</span>
            </span>
            <div>
              <p className="text-gray-900 font-bold text-base sm:text-lg tracking-tight leading-tight">Dottie</p>
              <p className="text-gray-400 text-xs leading-tight">Invoicing simplified.</p>
            </div>
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-md shadow-emerald-200 transition-all active:scale-95"
          >
            Sign up
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="text-center mb-8">
          <p className="text-emerald-700 text-xs font-semibold uppercase tracking-widest mb-3">Book a demo</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 mb-3">
            See Dottie in action
          </h1>
          <p className="text-gray-600 text-lg leading-relaxed max-w-xl mx-auto">
            Pick a time that suits you and we&apos;ll walk you through how Dottie puts your childminding invoices on autopilot — no pressure, no prep needed.
          </p>
        </div>

        {/* Embedded Google Calendar appointment scheduler */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <iframe
            src={EMBED_URL}
            title="Book a demo with Dottie"
            className="w-full"
            style={{ height: '700px', border: 0 }}
            loading="lazy"
          />
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Can&apos;t see the calendar?{' '}
          <a
            href={BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-700 font-semibold underline underline-offset-2 hover:text-emerald-800"
          >
            Open the booking page in a new tab →
          </a>
        </p>

        <p className="text-center text-sm text-gray-500 mt-10">
          Prefer to jump straight in?{' '}
          <Link href="/signup" className="text-emerald-700 font-semibold hover:text-emerald-800">
            Sign up
          </Link>{' '}
          and choose a plan.
        </p>
      </main>
    </div>
  )
}
