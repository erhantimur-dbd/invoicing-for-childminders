import Link from 'next/link'
import { marketing, ctaRadiusStyle } from '@/lib/marketing.mjs'

function Check({ on }: { on: boolean }) {
  if (!on) {
    return <span className="text-[13px]" style={{ color: marketing.muted }}>—</span>
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-label="Included" className="inline-block">
      <path d="M3 8.2 6.2 11.3 13 4.5" stroke={marketing.accent} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function PricingCards({ enquiriesHref = '/signup' }: { enquiriesHref?: string }) {
  return (
    <div
      className="grid sm:grid-cols-3 gap-px"
      data-pricing-cards="true"
      style={{ backgroundColor: marketing.hairline, border: `1px solid ${marketing.hairline}` }}
    >
      {marketing.pricingPlans.map((plan) => {
        const href = plan.id === 'enquiries' ? enquiriesHref : plan.href
        return (
          <article key={plan.id} className="bg-white p-8 sm:p-10 flex flex-col h-full">
            <p className="text-[13px] font-semibold tracking-tight">{plan.name}</p>
            <p className="mt-2 text-[14px] leading-relaxed" style={{ color: marketing.muted }}>
              {plan.icp}
            </p>
            <p className="mt-6 text-[36px] sm:text-[40px] tracking-tight leading-none">
              {plan.price}
              <span className="text-[16px] font-normal" style={{ color: marketing.muted }}> {plan.period}</span>
            </p>
            <p className="text-[13px] mt-1" style={{ color: marketing.muted }}>{plan.note}</p>
            <p className="mt-6 text-[15px] leading-relaxed flex-1" style={{ color: marketing.muted }}>
              {plan.body}
            </p>
            {plan.checkout ? (
              <Link
                href={href}
                className="mt-10 inline-flex w-full min-h-[44px] items-center justify-center px-6 text-[15px] font-medium text-white bg-[#0b1220]"
                style={ctaRadiusStyle()}
              >
                {plan.cta}
              </Link>
            ) : (
              <Link
                href={href}
                className="mt-10 inline-flex w-full min-h-[44px] items-center justify-center border border-[#0b1220] bg-white px-6 text-[15px] font-medium text-[#0b1220]"
                style={ctaRadiusStyle()}
              >
                {plan.cta}
              </Link>
            )}
          </article>
        )
      })}
    </div>
  )
}

export default function Pricing() {
  return (
    <section id="pricing" className="px-6 py-24 scroll-mt-16">
      <div className="max-w-[1120px] mx-auto">
        <p className="marketing-kicker mb-4" style={{ color: marketing.muted }}>
          {marketing.pricingKicker}
        </p>
        <h2 className="text-[34px] sm:text-[44px] tracking-[-0.03em] font-semibold max-w-[640px]">
          {marketing.pricingLead}
        </h2>
        <p className="mt-4 text-[13px] leading-relaxed max-w-[40rem]" style={{ color: marketing.muted }}>
          {marketing.enquiriesQuotaLine}
        </p>
        <div className="mt-10">
          <PricingCards />
        </div>

        <div className="mt-16 overflow-x-auto" data-pricing-compare="true">
          <p className="marketing-kicker mb-4" style={{ color: marketing.muted }}>Compare</p>
          <table className="w-full min-w-[480px] text-left border-collapse" style={{ borderColor: marketing.hairline }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${marketing.hairline}` }}>
                <th className="py-3 pr-4 text-[13px] font-semibold">Feature</th>
                {marketing.pricingCompare.columns.map((col) => (
                  <th key={col.id} className="py-3 px-3 text-[13px] font-semibold text-center">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {marketing.pricingCompare.rows.map((row) => (
                <tr key={row.feature} style={{ borderBottom: `1px solid ${marketing.hairline}` }}>
                  <td className="py-3 pr-4 text-[14px]">{row.feature}</td>
                  {marketing.pricingCompare.columns.map((col) => (
                    <td key={col.id} className="py-3 px-3 text-center">
                      <Check on={Boolean(row[col.id as 'enquiries' | 'both'])} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
