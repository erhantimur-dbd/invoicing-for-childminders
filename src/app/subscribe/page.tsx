'use client'

import { useState } from 'react'
import Link from 'next/link'

const FEATURES_COMMON = [
  'Auto-generate invoices',
  'PDF invoices',
  'Expense tracking',
  'Tax year reports',
  '7-day free trial',
]

const PLANS = [
  {
    id: 'starter',
    label: 'Starter',
    children: 'Up to 5 children',
    monthly: 9.99,
    annual: 99,
    annualMonthly: 8.25,
    features: ['Up to 5 children', ...FEATURES_COMMON],
    highlight: false,
    cta: 'Start free trial',
  },
  {
    id: 'professional',
    label: 'Professional',
    children: 'Up to 20 children',
    monthly: 19.99,
    annual: 199,
    annualMonthly: 16.58,
    features: ['Up to 20 children', ...FEATURES_COMMON],
    highlight: true,
    cta: 'Start free trial',
  },
] as const

type PlanId = 'starter' | 'professional'

export default function SubscribePage() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual')
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [stripeUnavailable, setStripeUnavailable] = useState(false)

  async function handleCheckout(planId: PlanId) {
    setLoadingPlan(planId)
    setStripeUnavailable(false)

    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: billing, tier: planId }),
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
      {/* Trial banner */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-500 to-sky-500 p-5 text-white text-center shadow-lg shadow-emerald-200/40">
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="text-xl">🎉</span>
          <span className="font-extrabold text-lg">Your 7-day free trial has started!</span>
        </div>
        <p className="text-white/85 text-sm">
          Choose a plan to continue after your trial ends. You won&apos;t be charged until your trial is over.
        </p>
      </div>

      {/* Stripe unavailable notice */}
      {stripeUnavailable && (
        <div className="rounded-2xl bg-sky-50 border border-sky-200 p-5 text-center">
          <div className="text-sky-600 font-semibold mb-1">💳 Payment setup coming soon</div>
          <p className="text-sky-700/80 text-sm">
            Your trial is active and you can use the app fully. We&apos;ll let you know when billing is ready.
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
          <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full font-bold">Save 17%</span>
        </button>
      </div>

      {/* Plan cards */}
      <div className="grid sm:grid-cols-2 gap-6">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-3xl p-8 flex flex-col ${
              plan.highlight
                ? 'border-2 border-emerald-500 bg-white shadow-xl shadow-emerald-100/50'
                : 'border border-gray-200 bg-white shadow-md'
            }`}
          >
            {plan.highlight && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="px-4 py-1.5 rounded-full bg-sky-500 text-white text-xs font-extrabold shadow-md whitespace-nowrap">
                  Most popular
                </span>
              </div>
            )}

            <div className="mb-6">
              <div className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-2">{plan.label}</div>
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
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">✓</span>
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout(plan.id)}
              disabled={loadingPlan !== null}
              className={`w-full py-3 rounded-2xl font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                plan.highlight
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200'
                  : 'border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              {loadingPlan === plan.id ? (
                <>
                  <span className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${plan.highlight ? 'border-white' : 'border-emerald-600'}`} />
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
          href="mailto:support@dottie.cloud?subject=Unlimited plan enquiry"
          className="shrink-0 px-5 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:border-slate-400 transition-colors"
        >
          Get in touch →
        </a>
      </div>

      {/* Skip for now */}
      <div className="text-center space-y-1">
        <p className="text-gray-500 text-sm">Not ready to choose yet? Your trial is fully active.</p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-emerald-600 font-semibold hover:text-emerald-700 transition-colors"
        >
          Continue to app →
        </Link>
      </div>

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
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-semibold hover:border-emerald-400 hover:text-emerald-700 transition-colors disabled:opacity-60 shadow-sm"
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
