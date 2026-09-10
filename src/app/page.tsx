import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Metadata } from 'next'
import SiteHeader from '@/components/marketing/SiteHeader'
import SiteFooter from '@/components/marketing/SiteFooter'
import EmailFlow from '@/components/marketing/EmailFlow'
import Pricing from '@/components/marketing/Pricing'
import { marketing, marketingCtaClass, ctaRadiusStyle, pricingAmounts } from '@/lib/marketing.mjs'

export const metadata: Metadata = {
  title: 'Dottie — AI assistant for UK childminders',
  description: marketing.subhead,
  alternates: { canonical: 'https://www.godottie.cloud' },
  openGraph: {
    title: marketing.headline,
    description: marketing.subhead,
    url: 'https://www.godottie.cloud',
    type: 'website',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Dottie',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: 'https://www.godottie.cloud',
  description: marketing.subhead,
  offers: [
    {
      '@type': 'Offer',
      name: 'Enquiries',
      price: String(pricingAmounts.enquiries.annual),
      priceCurrency: 'GBP',
      billingIncrement: 'P1Y',
    },
    {
      '@type': 'Offer',
      name: 'Enquiries + invoicing',
      price: String(pricingAmounts.bothFrom.annual),
      priceCurrency: 'GBP',
      billingIncrement: 'P1Y',
    },
  ],
}

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <div
      className={`${marketing.pageClass} min-h-screen overflow-x-clip`}
      style={{ backgroundColor: marketing.canvas, color: marketing.ink, fontFamily: marketing.fontFamily }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <SiteHeader />

      <main>
        <section className="marketing-hero-field" style={{ backgroundColor: marketing.hero, color: '#f6f7f9' }}>
          <div className="max-w-[1120px] mx-auto px-6 pt-16 pb-20 sm:pt-24 sm:pb-28 grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            <div>
              <p className="marketing-kicker" style={{ color: marketing.heroMuted }}>
                {marketing.kicker}
              </p>
              <h1 className="mt-5 text-[40px] sm:text-[56px] lg:text-[64px] leading-[1.05] tracking-[-0.035em] font-semibold">
                {marketing.headline}
              </h1>
              <p
                className="mt-6 text-[16px] sm:text-[17px] leading-relaxed max-w-[34rem]"
                style={{ color: marketing.heroMuted }}
              >
                {marketing.subhead}
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Link href={marketing.ctas.signup.href} className={marketingCtaClass.primaryOnDark} style={ctaRadiusStyle()}>
                  {marketing.ctas.signup.label}
                </Link>
                <Link href={marketing.ctas.demo.href} className={marketingCtaClass.secondaryOnDark} style={ctaRadiusStyle()}>
                  {marketing.ctas.demo.label}
                </Link>
              </div>
            </div>
            <EmailFlow />
          </div>
        </section>

        <section className="border-b bg-white" style={{ borderColor: marketing.hairline }}>
          <div className="max-w-[1120px] mx-auto px-6 py-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {marketing.trust.map((item) => (
              <div key={item.title}>
                <p className="text-[13px] font-semibold tracking-tight">{item.title}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: marketing.muted }}>
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="px-6 py-24">
          <div className="max-w-[1120px] mx-auto">
            <p className="marketing-kicker mb-4" style={{ color: marketing.muted }}>What Dottie runs</p>
            <h2 className="text-[34px] sm:text-[44px] tracking-[-0.03em] font-semibold mb-12 max-w-[18ch]">
              One assistant. The whole business end.
            </h2>
            <div
              className="grid sm:grid-cols-2 gap-px"
              style={{ backgroundColor: marketing.hairline, border: `1px solid ${marketing.hairline}` }}
            >
              {marketing.capabilities.map((item) => (
                <div key={item.title} className="bg-white p-8 sm:p-10 min-h-[180px]">
                  <p className="marketing-kicker mb-4" style={{ color: marketing.muted }}>{item.title}</p>
                  <p className="text-[22px] sm:text-[24px] tracking-tight leading-snug font-semibold">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="px-6 py-24 bg-white border-y scroll-mt-16" style={{ borderColor: marketing.hairline }}>
          <div className="max-w-[1120px] mx-auto">
            <p className="marketing-kicker mb-4" style={{ color: marketing.muted }}>Process</p>
            <h2 className="text-[34px] sm:text-[44px] tracking-[-0.03em] font-semibold mb-16 max-w-[20ch]">
              {marketing.howItWorksTitle}
            </h2>
            <div className="relative">
              <div
                className="hidden lg:block absolute left-0 right-0 top-[11px] h-px pointer-events-none"
                style={{ backgroundColor: marketing.hairline }}
                aria-hidden="true"
              />
            <ol className="relative grid sm:grid-cols-2 lg:grid-cols-5 gap-10">
              {marketing.flow.map((step, i) => (
                <li key={step.id} className="relative">
                  <p
                    className="inline-block pr-3 text-[12px] tabular-nums tracking-[0.12em] bg-white"
                    style={{ color: marketing.muted }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </p>
                  <h3 className="mt-4 text-[18px] tracking-tight font-semibold">{step.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed" style={{ color: marketing.muted }}>{step.body}</p>
                </li>
              ))}
            </ol>
            </div>
          </div>
        </section>

        <section
          id="invoicing"
          className="px-6 py-24 scroll-mt-16"
        >
          <div className="max-w-[1120px] mx-auto grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            <div>
              <p className="marketing-kicker mb-4" style={{ color: marketing.muted }}>
                {marketing.invoicing.name}
              </p>
              <h2 className="text-[34px] sm:text-[44px] tracking-[-0.03em] leading-[1.15] font-semibold">
                {marketing.invoicing.line}
              </h2>
            </div>
            <p className="text-[17px] leading-relaxed lg:pt-10" style={{ color: marketing.muted }}>
              {marketing.invoicing.body}
            </p>
          </div>
        </section>

        <section className="px-6 py-24 bg-white border-y" style={{ borderColor: marketing.hairline }}>
          <div className="max-w-[1120px] mx-auto">
            <p className="marketing-kicker mb-4" style={{ color: marketing.muted }}>Fit</p>
            <h2 className="text-[34px] sm:text-[44px] tracking-[-0.03em] font-semibold mb-12 max-w-[22ch]">
              {marketing.forWho.title}
            </h2>
            <div className="grid md:grid-cols-2 gap-px" style={{ backgroundColor: marketing.hairline, border: `1px solid ${marketing.hairline}` }}>
              <div className="bg-white p-8 sm:p-10">
                <p className="marketing-kicker mb-4" style={{ color: marketing.muted }}>{marketing.forWho.yesLabel}</p>
                <p className="text-[18px] leading-relaxed tracking-tight">{marketing.forWho.yes}</p>
              </div>
              <div className="bg-white p-8 sm:p-10">
                <p className="marketing-kicker mb-4" style={{ color: marketing.muted }}>{marketing.forWho.noLabel}</p>
                <p className="text-[18px] leading-relaxed tracking-tight" style={{ color: marketing.muted }}>{marketing.forWho.no}</p>
              </div>
            </div>
          </div>
        </section>

        <Pricing />

        <section style={{ backgroundColor: marketing.hero, color: '#f6f7f9' }}>
          <div className="max-w-[1120px] mx-auto px-6 py-24">
            <p className="marketing-kicker mb-5" style={{ color: marketing.heroMuted }}>
              {marketing.floorLine}
            </p>
            <h2 className="text-[34px] sm:text-[48px] tracking-[-0.03em] font-semibold max-w-[18ch] leading-[1.12]">
              {marketing.closing}
            </h2>
            <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link href={marketing.ctas.signup.href} className={marketingCtaClass.primaryOnDark} style={ctaRadiusStyle()}>
                {marketing.ctas.signup.label}
              </Link>
              <Link href={marketing.ctas.demo.href} className={marketingCtaClass.secondaryOnDark} style={ctaRadiusStyle()}>
                {marketing.ctas.demo.label}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
