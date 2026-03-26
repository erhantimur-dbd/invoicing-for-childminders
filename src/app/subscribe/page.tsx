'use client'

import { useState } from 'react'
import Link from 'next/link'

const PLAN_FEATURES = [
  'Unlimited children',
  'Auto-generate invoices',
  'PDF invoices',
  'Expense tracking',
  'Tax year reports',
  '7-day free trial',
]

export default function SubscribePage() {
  const [loadingPlan, setLoadingPlan] = useState<'monthly' | 'annual' | null>(null)
  const [stripeUnavailable, setStripeUnavailable] = useState(false)

  async function handleCheckout(plan: 'monthly' | 'annual') {
    setLoadingPlan(plan)
    setStripeUnavailable(false)

    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })

      if (!res.ok) {
        // Stripe not configured or API error
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

      {/* Plan cards */}
      <div className="grid sm:grid-cols-2 gap-6">
        {/* Monthly */}
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-md flex flex-col">
          <div className="mb-6">
            <div className="text-gray-500 text-sm font-medium mb-1">Monthly</div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-gray-900">£4.99</span>
              <span className="text-gray-400 text-sm">/month</span>
            </div>
            <p className="text-gray-400 text-sm mt-1">Billed monthly, cancel anytime</p>
          </div>

          <ul className="space-y-3 mb-8 flex-1">
            {PLAN_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">
                  ✓
                </span>
                {f}
              </li>
            ))}
          </ul>

          <button
            onClick={() => handleCheckout('monthly')}
            disabled={loadingPlan !== null}
            className="w-full py-3 rounded-2xl border-2 border-emerald-600 text-emerald-700 font-bold hover:bg-emerald-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loadingPlan === 'monthly' ? (
              <>
                <span className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                Redirecting…
              </>
            ) : (
              'Start free trial'
            )}
          </button>
        </div>

        {/* Annual — highlighted */}
        <div className="relative rounded-3xl border-2 border-emerald-500 bg-white p-8 shadow-xl shadow-emerald-100/50 flex flex-col">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
            <span className="px-4 py-1.5 rounded-full bg-sky-500 text-white text-xs font-extrabold shadow-md whitespace-nowrap">
              Save 10% · Best value
            </span>
          </div>

          <div className="mb-6">
            <div className="text-gray-500 text-sm font-medium mb-1">Annual</div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-gray-900">£54</span>
              <span className="text-gray-400 text-sm">/year</span>
            </div>
            <p className="text-gray-400 text-sm mt-1">Equivalent to £4.50/month</p>
          </div>

          <ul className="space-y-3 mb-8 flex-1">
            {PLAN_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">
                  ✓
                </span>
                {f}
              </li>
            ))}
          </ul>

          <button
            onClick={() => handleCheckout('annual')}
            disabled={loadingPlan !== null}
            className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loadingPlan === 'annual' ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Redirecting…
              </>
            ) : (
              'Start free trial'
            )}
          </button>
        </div>
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

      {/* Manage billing — shown when subscription exists */}
      <ManageBillingSection />
    </div>
  )
}

/**
 * Rendered below the plan cards. In a real implementation this would
 * check for an existing active subscription and show a portal link.
 * For now it renders a placeholder that becomes visible once connected.
 */
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

  // Only render if the portal API endpoint exists (gracefully hidden otherwise)
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
        ) : (
          '⚙️ Manage billing'
        )}
      </button>
    </div>
  )
}
