'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ENQUIRIES_PRICE } from '@/lib/enquiries/types'
import { marketing, pricingAmounts } from '@/lib/marketing.mjs'
import { enquiriesQuotaCopy } from '@/lib/enquiries/quota.mjs'

type SubState = {
  status: string | null
  trial_end: string | null
  stripe_subscription_id: string | null
  enquiries_status?: string | null
  enquiries_stripe_subscription_id?: string | null
}

const FEATURES_COMMON = [
  'Auto-generate invoices',
  'PDF invoices',
  'Expense tracking',
  'Tax year reports',
  'Cancel anytime',
]

const PLANS = [
  {
    id: 'starter',
    label: 'Starter',
    children: 'Up to 5 children',
    monthly: pricingAmounts.invoicingFrom.monthly,
    annual: pricingAmounts.invoicingFrom.annual,
    annualMonthly: pricingAmounts.invoicingFrom.annualMonthly,
    features: ['Up to 5 children', ...FEATURES_COMMON],
    highlight: false,
    cta: 'Add invoicing',
  },
  {
    id: 'professional',
    label: 'Professional',
    children: 'Up to 20 children',
    monthly: pricingAmounts.professional.monthly,
    annual: pricingAmounts.professional.annual,
    annualMonthly: pricingAmounts.professional.annualMonthly,
    features: ['Up to 20 children', ...FEATURES_COMMON],
    highlight: false,
    cta: 'Add invoicing',
  },
] as const

type PlanId = 'starter' | 'professional'

export default function SubscribePage() {
  const searchParams = useSearchParams()
  const highlightEnquiries = searchParams.get('product') !== 'invoicing'
  const nextParam = searchParams.get('next')
  const continuePath =
    nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : null
  const [billing, setBilling] = useState<'monthly' | 'annual'>(
    searchParams.get('billing') === 'monthly' ? 'monthly' : 'annual',
  )
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [stripeUnavailable, setStripeUnavailable] = useState(false)
  const [sub, setSub] = useState<SubState | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/me/subscription')
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then((j: { subscription: SubState | null }) => { if (!cancelled) setSub(j.subscription) })
      .catch(() => { /* non-fatal — page still works without state */ })
    return () => { cancelled = true }
  }, [])

  const trialDaysLeft = sub?.trial_end
    ? Math.ceil((new Date(sub.trial_end).getTime() - Date.now()) / 86_400_000)
    : null

  async function handleCheckout(planId: PlanId | 'enquiries') {
    setLoadingPlan(planId)
    setStripeUnavailable(false)

    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          planId === 'enquiries'
            ? { product: 'enquiries', plan: billing }
            : { plan: billing, tier: planId },
        ),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (res.status === 503 || data?.code === 'stripe_not_configured') {
          setStripeUnavailable(true)
          setLoadingPlan(null)
          return
        }
        throw new Error(data?.error ?? 'Failed to start checkout')
      }

      const { url } = await res.json()
      if (url) {
        window.location.href = url
      } else {
        setStripeUnavailable(true)
        setLoadingPlan(null)
      }
    } catch {
      setStripeUnavailable(true)
      setLoadingPlan(null)
    }
  }

  return (
    <div className="space-y-8">
      {/* State-aware top banner */}
      {sub?.status === 'past_due' ? (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">⚠️</span>
            <span className="font-bold text-red-900 text-lg">Your last payment failed</span>
          </div>
          <p className="text-red-800/90 text-sm leading-relaxed">
            We couldn&apos;t charge your card. Update your payment method below to keep your subscription active and avoid losing access to your records.
          </p>
        </div>
      ) : sub?.status === 'active' ? (
        <div className="border bg-white p-5" style={{ borderColor: 'rgba(11,18,32,0.10)', borderRadius: 4 }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-[#0b1220] text-lg">Your subscription is active</span>
          </div>
          <p className="text-[#5b6573] text-sm leading-relaxed">
            Manage billing or change plan below.
          </p>
        </div>
      ) : sub?.status === 'trialing' && trialDaysLeft !== null && trialDaysLeft > 0 ? (
        <div className="p-5 text-white text-center" style={{ backgroundColor: '#0b1220', borderRadius: 4 }}>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="font-semibold text-lg">
              {trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'} left on your free trial
            </span>
          </div>
          <p className="text-white/70 text-sm">
            No card needed yet. Pick a plan whenever you&apos;re ready — we&apos;ll only charge after your trial ends.
          </p>
        </div>
      ) : (
        <div className="p-5 text-white text-center" style={{ backgroundColor: '#0b1220', borderRadius: 4 }}>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="font-semibold text-lg">Choose your plan</span>
          </div>
          <p className="text-white/70 text-sm">
            Start with Dottie. Add invoicing when a child is on roll. Same account. Cancel anytime.
          </p>
        </div>
      )}

      {continuePath ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-700">
          Add invoicing to raise invoices for the family you just accepted. After checkout, open{' '}
          <Link href={continuePath} className="text-[#123a4a] font-medium underline underline-offset-2">
            Add child from enquiry
          </Link>
          {' '}to copy their details — you still enter rates.
        </div>
      ) : null}

      {/* Stripe unavailable notice */}
      {stripeUnavailable && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5 text-center">
          <div className="text-amber-700 font-semibold mb-1">💳 Hold on — billing is briefly unavailable</div>
          <p className="text-amber-800/80 text-sm">
            We couldn&apos;t reach Stripe just now. Please try again in a moment.
          </p>
        </div>
      )}

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setBilling('monthly')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${billing === 'monthly' ? 'bg-gray-900 text-white shadow' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBilling('annual')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${billing === 'annual' ? 'bg-gray-900 text-white shadow' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Annual
          <span className="text-xs bg-[#123a4a] text-white px-2 py-0.5 font-bold">{marketing.annualSaveLabel}</span>
        </button>
      </div>

      {/* Enquiries — the hero product */}
      <div className={`relative p-8 bg-white ${highlightEnquiries ? 'border-2 border-[#123a4a]' : 'border border-gray-200'}`}>
        {highlightEnquiries && (
          <div className="absolute -top-3 left-8">
            <span className="px-3 py-1 bg-[#0b1220] text-white text-xs font-semibold whitespace-nowrap">
              Start here
            </span>
          </div>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-[#123a4a] mb-2">Dottie</div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-gray-900">
                £{billing === 'annual' ? ENQUIRIES_PRICE.annual : ENQUIRIES_PRICE.monthly}
              </span>
              <span className="text-gray-400 text-sm">/{billing === 'annual' ? 'year' : 'month'}</span>
            </div>
            {billing === 'annual' && (
              <p className="text-gray-400 text-sm mt-1">Equivalent to £{ENQUIRIES_PRICE.annualMonthly}/month</p>
            )}
            <p className="text-gray-600 text-sm mt-3 max-w-md">
              Answer new parents, match a listed space, offer a visit in your hours. One extra child pays for years of this.
            </p>
            <p className="text-gray-500 text-sm mt-2 max-w-md">{enquiriesQuotaCopy()}</p>
          </div>
          {sub?.enquiries_status === 'active' ? (
            <p className="text-[#123a4a] font-semibold text-sm">Already on your account</p>
          ) : (
            <button
              onClick={() => handleCheckout('enquiries')}
              disabled={loadingPlan !== null}
              className="shrink-0 px-6 py-3 bg-[#123a4a] hover:bg-[#0c2c38] text-white font-semibold disabled:opacity-60"
            >
              {loadingPlan === 'enquiries' ? 'Redirecting…' : 'Start Dottie'}
            </button>
          )}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest">When a child starts — invoicing</p>
        <p className="text-gray-500 text-sm mt-1">Same login. Add it once they are on roll — funded hours, PDFs, Sunday invoices.</p>
      </div>

      {/* Plan cards */}
      <div className="grid sm:grid-cols-2 gap-6">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`relative p-8 flex flex-col bg-white ${
              plan.highlight
                ? 'border-2 border-[#123a4a]'
                : 'border border-gray-200'
            }`}
          >
            <div className="mb-6">
              <div className="text-xs font-semibold uppercase tracking-widest text-[#123a4a] mb-2">{plan.label}</div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-gray-900">
                  £{billing === 'annual' ? plan.annual : plan.monthly}
                </span>
                <span className="text-gray-400 text-sm">/{billing === 'annual' ? 'year' : 'month'}</span>
              </div>
              {billing === 'annual' && (
                <p className="text-gray-400 text-sm mt-1">Equivalent to £{plan.annualMonthly}/month</p>
              )}
              <p className="text-gray-500 text-sm font-medium mt-3">{plan.children}</p>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                  <span className="flex-shrink-0 w-5 h-5 bg-[#eef0f3] text-[#123a4a] flex items-center justify-center text-xs font-bold">✓</span>
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout(plan.id)}
              disabled={loadingPlan !== null}
              className={`w-full py-3 font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                plan.highlight
                  ? 'bg-[#123a4a] hover:bg-[#0c2c38] text-white'
                  : 'border border-[#123a4a]/30 text-[#123a4a] hover:border-[#123a4a]/70'
              }`}
            >
              {loadingPlan === plan.id ? (
                <>
                  <span className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${plan.highlight ? 'border-white' : 'border-[#123a4a]'}`} />
                  Redirecting…
                </>
              ) : plan.cta}
            </button>
          </div>
        ))}
      </div>

      {/* Unlimited / Enterprise */}
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-gray-900">Need more than 20 children?</p>
          <p className="text-gray-500 text-sm mt-0.5">Our Unlimited plan is available for larger childminding settings.</p>
        </div>
        <a
          href="mailto:support@godottie.cloud?subject=Unlimited plan enquiry"
          className="shrink-0 px-5 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:border-slate-400 transition-colors"
        >
          Get in touch →
        </a>
      </div>

      {/* Skip for now — only shown while a usable trial is active */}
      {sub?.status === 'trialing' && trialDaysLeft !== null && trialDaysLeft > 0 && (
        <div className="text-center space-y-1">
          <p className="text-gray-500 text-sm">Not ready to choose yet? Carry on with your trial.</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-[#123a4a] font-semibold hover:text-[#0c2c38] transition-colors"
          >
            Continue to app →
          </Link>
        </div>
      )}

      {/* Manage billing */}
      <ManageBillingSection />
    </div>
  )
}

function ManageBillingSection() {
  const [portalLoading, setPortalLoading] = useState(false)

  async function openPortal() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      if (res.ok) {
        const { url } = await res.json()
        if (url) window.location.href = url
      }
    } finally {
      setPortalLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 text-center">
      <p className="text-gray-500 text-sm font-medium mb-3">Already have a subscription?</p>
      <button
        onClick={openPortal}
        disabled={portalLoading}
        className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-200 bg-white text-gray-700 text-sm font-semibold hover:border-[#123a4a] hover:text-[#123a4a] transition-colors disabled:opacity-60"
      >
        {portalLoading ? (
          <>
            <span className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            Loading…
          </>
        ) : '⚙️ Manage billing'}
      </button>
    </div>
  )
}
