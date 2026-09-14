import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import ChildForm from '@/components/ChildForm'
import { getChildLimit, isAtLimit, TIER_LABELS } from '@/lib/childLimit'
import { childFormPrefill } from '@/lib/enquiries/prospect-to-child.mjs'
import type { SubscriptionTier } from '@/lib/types'

export default async function NewChildPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; id?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const q = await searchParams

  // Get active child count and subscription tier
  const [{ count }, { data: subscription }] = await Promise.all([
    supabase
      .from('children')
      .select('*', { count: 'exact', head: true })
      .eq('childminder_id', user.id)
      .is('archived_at', null),
    supabase
      .from('subscriptions')
      .select('tier')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  const activeCount = count ?? 0
  const tier = (subscription?.tier ?? 'starter') as SubscriptionTier
  const limit = getChildLimit(tier)
  const atLimit = isAtLimit(activeCount, tier)

  if (atLimit) {
    const tierLabel = TIER_LABELS[tier]
    const nextTier = tier === 'starter' ? 'Professional' : null

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/children" className="text-gray-400 hover:text-gray-600">
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add child</h1>
            <p className="text-gray-500 text-sm">Fill in the details below</p>
          </div>
        </div>

        <div className="max-w-lg">
          <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🔒</span>
              <div>
                <h2 className="font-bold text-gray-900 text-base">
                  {tierLabel} plan limit reached
                </h2>
                <p className="text-gray-600 text-sm mt-1">
                  You have reached the {limit}-child limit on your {tierLabel} plan.
                  {activeCount} of {limit} children added.
                </p>
              </div>
            </div>

            {nextTier ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-700 font-medium">
                  Upgrade to {nextTier} to add up to 20 children:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white border border-gray-200 p-3 text-center">
                    <p className="text-xs text-gray-500 mb-0.5">Monthly</p>
                    <p className="text-xl font-bold text-gray-900">£19.99</p>
                    <p className="text-xs text-gray-400">/month</p>
                  </div>
                  <div className="rounded-xl bg-white border-2 border-emerald-200 p-3 text-center">
                    <p className="text-xs text-gray-500 mb-0.5">Annual</p>
                    <p className="text-xl font-bold text-gray-900">£199</p>
                    <p className="text-xs text-gray-400">/year · save 17%</p>
                  </div>
                </div>
                <Link
                  href="/subscribe"
                  className="block w-full text-center py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors"
                >
                  Upgrade to Professional →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-700">
                  For unlimited children, get in touch with us:
                </p>
                <a
                  href="mailto:support@godottie.cloud?subject=Enterprise plan enquiry"
                  className="block w-full text-center py-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-sm transition-colors"
                >
                  Contact us about Enterprise →
                </a>
              </div>
            )}

            <Link
              href="/children"
              className="block text-center text-sm text-gray-400 hover:text-gray-600"
            >
              ← Back to children
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/children" className="text-gray-400 hover:text-gray-600">
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add child</h1>
          <p className="text-gray-500 text-sm">
            {limit === Infinity
              ? `${activeCount} children added`
              : `${activeCount} of ${limit} children on your plan`}
          </p>
        </div>
      </div>
      <ChildForm mode="new" initialValues={await loadProspectPrefill(supabase, user.id, q)} />
    </div>
  )
}

async function loadProspectPrefill(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  q: { from?: string; id?: string },
) {
  if (q.from === 'prospect' && q.id) {
    const [{ data: prospect }, { data: settings }] = await Promise.all([
      supabase.from('enquiry_prospects').select('*').eq('id', q.id).eq('user_id', userId).maybeSingle(),
      supabase.from('enquiry_settings').select('day_rate').eq('user_id', userId).maybeSingle(),
    ])
    if (!prospect) return undefined
    const prefill = childFormPrefill(prospect)
    if (settings?.day_rate && !prefill.daily_rate) {
      return { ...prefill, daily_rate: Number(settings.day_rate) }
    }
    return prefill
  }
  return undefined
}
