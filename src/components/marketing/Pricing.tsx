'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  marketing,
  marketingCtaClass,
  ctaRadiusStyle,
  yearlyFromMonthly,
  formatGbp,
} from '@/lib/marketing.mjs'

type Billing = 'monthly' | 'annual'

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

export default function Pricing() {
  const [billing, setBilling] = useState<Billing>('annual')

  return (
    <section id="pricing" className="px-6 py-24 scroll-mt-16">
      <div className="max-w-[1120px] mx-auto">
        <p className="marketing-kicker mb-4" style={{ color: marketing.muted }}>
          {marketing.pricingKicker}
        </p>
        <h2 className="text-[34px] sm:text-[44px] tracking-[-0.03em] font-semibold max-w-[640px]">
          {marketing.pricingLead}
        </h2>

        <div
          role="tablist"
          aria-label="Billing period"
          data-billing-toggle="true"
          className="mt-10 inline-flex p-0.5"
          style={{ border: `1px solid ${marketing.hairline}`, backgroundColor: '#fff' }}
        >
          {(['monthly', 'annual'] as const).map((id) => {
            const selected = billing === id
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setBilling(id)}
                className="px-4 py-2 text-[13px] font-semibold tracking-tight inline-flex items-center gap-2"
                style={{
                  backgroundColor: selected ? marketing.ink : 'transparent',
                  color: selected ? '#f6f7f9' : marketing.muted,
                  borderRadius: marketing.ctaRadiusPx,
                }}
              >
                {id === 'monthly' ? 'Monthly' : 'Annual'}
                {id === 'annual' ? (
                  <span
                    className="text-[11px] font-semibold tracking-tight"
                    style={{ color: selected ? '#f6f7f9' : marketing.accent }}
                  >
                    {marketing.annualSaveLabel}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
        <p className="mt-4 text-[13px] leading-relaxed max-w-[40rem]" style={{ color: marketing.muted }}>
          {marketing.enquiriesQuotaLine}
        </p>

        <div
          className="mt-10 grid sm:grid-cols-2 gap-px"
          style={{ backgroundColor: marketing.hairline, border: `1px solid ${marketing.hairline}` }}
        >
          {marketing.pricingPlans.map((plan) => {
            const primary = plan.featured || plan.id === 'enquiries'
            const annual = billing === 'annual'
            const price = annual ? formatGbp(yearlyFromMonthly(plan.monthlyAmount)) : formatGbp(plan.monthlyAmount)
            const period = annual ? '/year' : '/month'
            const note = annual ? plan.annualNote : plan.monthlyNote
            const href = `${plan.href}?billing=${billing}`
            return (
              <article
                key={plan.id}
                className="bg-white p-8 sm:p-10 grid grid-rows-[auto_4.5rem_auto_2.75rem_1fr_auto]"
                style={plan.featured ? { boxShadow: `inset 0 2px 0 ${marketing.accent}` } : undefined}
              >
                <p className="text-[13px] font-semibold tracking-tight">{plan.name}</p>
                <p className="mt-2 text-[14px] leading-relaxed" style={{ color: marketing.muted }}>
                  {plan.icp}
                </p>
                <p className="mt-6 text-[36px] sm:text-[40px] tracking-tight leading-none">
                  {plan.from ? (
                    <span className="text-[16px] font-normal" style={{ color: marketing.muted }}>from </span>
                  ) : (
                    <span className="text-[16px] font-normal invisible" aria-hidden="true">from </span>
                  )}
                  {price}
                  <span className="text-[16px] font-normal" style={{ color: marketing.muted }}>{period}</span>
                </p>
                <p className="text-[13px] mt-1" style={{ color: marketing.muted }}>{note}</p>
                <p className="mt-6 text-[15px] leading-relaxed" style={{ color: marketing.muted }}>
                  {plan.body}
                </p>
                <Link
                  href={href}
                  className={`${primary ? marketingCtaClass.primary : marketingCtaClass.secondary} mt-10 w-full`}
                  style={ctaRadiusStyle()}
                >
                  {plan.cta}
                </Link>
              </article>
            )
          })}
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
