import Link from 'next/link'
import type { Metadata } from 'next'
import SiteHeader from '@/components/marketing/SiteHeader'
import SiteFooter from '@/components/marketing/SiteFooter'
import { marketing, marketingCtaClass, ctaRadiusStyle } from '@/lib/marketing.mjs'

const URL = 'https://www.godottie.cloud/demo'

const BOOKING_URL =
  'https://calendar.google.com/calendar/appointments/schedules/AcZssZ3YyC0MdetkFG4rIFUnLXzOl3qrgkDtTd10pHbX9FXby20t7dwSSTrvOZZlp7CgN8Osiov7VQcV'
const EMBED_URL = `${BOOKING_URL}?gv=true`

export const metadata: Metadata = {
  title: 'Book a demo',
  description: marketing.demoSubhead,
  alternates: { canonical: URL },
  openGraph: {
    title: 'Book a demo — Dottie',
    description: marketing.demoSubhead,
    url: URL,
    type: 'website',
  },
}

export default function DemoPage() {
  return (
    <div
      className={`${marketing.pageClass} min-h-screen flex flex-col`}
      style={{ backgroundColor: marketing.canvas, color: marketing.ink, fontFamily: marketing.fontFamily }}
    >
      <SiteHeader />
      <main className="flex-1 max-w-[920px] mx-auto px-6 py-16 sm:py-24 w-full">
        <div className="mb-10 max-w-[640px]">
          <p className="text-[13px] tracking-[0.12em] uppercase mb-3" style={{ color: marketing.muted }}>
            {marketing.ctas.demo.label}
          </p>
          <h1 className="text-[34px] sm:text-[48px] tracking-[-0.03em] leading-tight font-semibold">
            {marketing.demoHeadline}
          </h1>
          <p className="mt-4 text-[17px] leading-relaxed" style={{ color: marketing.muted }}>
            {marketing.demoSubhead}
          </p>
        </div>

        <div className="overflow-hidden border" style={{ borderRadius: 18, borderColor: marketing.hairline }}>
          <iframe
            src={EMBED_URL}
            title="Book a demo with Dottie"
            className="w-full"
            style={{ height: '700px', border: 0 }}
            loading="lazy"
          />
        </div>

        <p className="text-[13px] mt-6" style={{ color: marketing.muted }}>
          Can&apos;t see the calendar?{' '}
          <a
            href={BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
            style={{ color: marketing.ink }}
          >
            Open the booking page in a new tab
          </a>
        </p>

        <p className="text-[13px] mt-10" style={{ color: marketing.muted }}>
          Prefer to start now?{' '}
          <Link
            href={marketing.ctas.signup.href}
            className={`${marketingCtaClass.primary} !px-4 !py-1.5 text-[13px] align-middle`}
            style={ctaRadiusStyle()}
          >
            {marketing.ctas.signup.label}
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  )
}
