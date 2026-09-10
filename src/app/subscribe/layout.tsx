import type { Metadata } from 'next'
import { Suspense } from 'react'
import SiteHeader from '@/components/marketing/SiteHeader'
import SiteFooter from '@/components/marketing/SiteFooter'
import { marketing, formatGbp, pricingAmounts } from '@/lib/marketing.mjs'

export const metadata: Metadata = {
  title: 'Plans & Pricing',
  description: `Start with Dottie at ${formatGbp(pricingAmounts.enquiries.monthly)}/mo or ${formatGbp(pricingAmounts.enquiries.annual)}/year (${pricingAmounts.discountPct}% off). Add invoicing when a child starts. Same account. Cancel anytime.`,
  alternates: { canonical: 'https://www.godottie.cloud/subscribe' },
  openGraph: {
    title: 'Plans & Pricing — Dottie',
    description: 'Dottie £19/mo · invoicing add-on from £9.99/mo when a child starts.',
    url: 'https://www.godottie.cloud/subscribe',
  },
}

export default function SubscribeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${marketing.pageClass} min-h-screen flex flex-col`}
      style={{ backgroundColor: marketing.canvas, color: marketing.ink, fontFamily: marketing.fontFamily }}
    >
      <SiteHeader />
      <main className="flex-1 flex flex-col items-center justify-start py-12 px-4 sm:px-6">
        <div className="w-full max-w-4xl">
          <Suspense fallback={null}>{children}</Suspense>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
