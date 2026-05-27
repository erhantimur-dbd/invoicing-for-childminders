'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, CheckCircle2 } from 'lucide-react'

type Subscription = {
  status: string | null
  plan: string | null
  trial_end: string | null
  current_period_end: string | null
  stripe_subscription_id: string | null
}

const POLL_INTERVAL_MS = 1500
const POLL_TIMEOUT_MS = 30_000

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function planLabel(plan: string | null): string {
  if (!plan) return 'Subscription'
  // Stored as "<tier>_<billing>" e.g. "professional_annual" — render nicely.
  const map: Record<string, string> = {
    starter_monthly: 'Starter (monthly)',
    starter_annual: 'Starter (annual)',
    professional_monthly: 'Professional (monthly)',
    professional_annual: 'Professional (annual)',
    monthly: 'Monthly',
    annual: 'Annual',
  }
  return map[plan] ?? plan
}

export default function SubscribeSuccessPage() {
  const [sub, setSub] = useState<Subscription | null>(null)
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    let cancelled = false
    const start = Date.now()

    async function tick() {
      if (cancelled) return
      try {
        const r = await fetch('/api/me/subscription', { cache: 'no-store' })
        if (r.ok) {
          const j: { subscription: Subscription | null } = await r.json()
          if (j.subscription?.stripe_subscription_id) {
            if (!cancelled) setSub(j.subscription)
            return // landed — stop polling
          }
        }
      } catch { /* swallow + retry */ }

      if (Date.now() - start > POLL_TIMEOUT_MS) {
        if (!cancelled) setTimedOut(true)
        return
      }
      setTimeout(tick, POLL_INTERVAL_MS)
    }
    tick()
    return () => { cancelled = true }
  }, [])

  // ── Still polling ────────────────────────────────────────────────────────
  if (!sub && !timedOut) {
    return (
      <Shell>
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-5 mx-auto">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
        <h1 className="text-xl font-extrabold text-gray-900 mb-2">Confirming your subscription…</h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          We&apos;re finishing up with Stripe. This usually takes a few seconds.
        </p>
      </Shell>
    )
  }

  // ── Polling timed out — webhook didn't land. Reassure but don't lie ──────
  if (timedOut) {
    return (
      <Shell>
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mb-5 mx-auto">
          <CheckCircle2 className="w-8 h-8 text-amber-600" />
        </div>
        <h1 className="text-xl font-extrabold text-gray-900 mb-2">Almost there</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          Stripe took a little longer than usual. Your payment went through — your subscription will appear shortly. Carry on to your dashboard, your trial is fully active in the meantime.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-md shadow-emerald-200/60 transition-all active:scale-95"
        >
          Go to dashboard →
        </Link>
      </Shell>
    )
  }

  // ── Trial-with-card on Stripe ─────────────────────────────────────────────
  const isTrialing = sub?.status === 'trialing'
  const trialEndLabel = formatDate(sub?.trial_end ?? null)
  const renewLabel = formatDate(sub?.current_period_end ?? null)

  return (
    <Shell>
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-5 mx-auto">
        <CheckCircle2 className="w-9 h-9 text-emerald-600" />
      </div>

      {isTrialing ? (
        <>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Card on file ✓</h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-1">
            <span className="font-semibold text-gray-700">{planLabel(sub?.plan ?? null)}</span> selected.
          </p>
          {trialEndLabel && (
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              Your free trial continues until <strong className="text-gray-700">{trialEndLabel}</strong>. We&apos;ll charge you on that date — cancel any time before then.
            </p>
          )}
        </>
      ) : (
        <>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">You&apos;re all set!</h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-1">
            <span className="font-semibold text-gray-700">{planLabel(sub?.plan ?? null)}</span> active.
          </p>
          {renewLabel && (
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              Next renewal: <strong className="text-gray-700">{renewLabel}</strong>.
            </p>
          )}
        </>
      )}

      <Link
        href="/dashboard"
        className="inline-flex items-center justify-center w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-md shadow-emerald-200/60 transition-all active:scale-95"
      >
        Go to dashboard →
      </Link>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-gray-200/60 border border-gray-100 p-10 text-center">
        {children}
      </div>
      <p className="mt-8 text-gray-400 text-sm text-center">
        Part of the <span className="text-amber-600 font-medium">Dottie OS</span> ecosystem
      </p>
    </div>
  )
}
