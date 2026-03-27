import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { Card, CardContent } from '@/components/ui/card'

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function formatGBP(n: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n)
}

function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-gray-400 text-xs">—</span>
  const map: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-800',
    trialing: 'bg-amber-100 text-amber-800',
    canceled: 'bg-gray-100 text-gray-500',
    past_due: 'bg-red-100 text-red-700',
    paused: 'bg-gray-100 text-gray-500',
    incomplete: 'bg-orange-100 text-orange-700',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

export default async function AdminSubscriptionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: adminProfile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!adminProfile || adminProfile.role !== 'admin') redirect('/dashboard')

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: subs } = await admin
    .from('subscriptions')
    .select('*, profiles(full_name, email)')
    .order('created_at', { ascending: false })

  const all = subs ?? []
  const active = all.filter(s => s.status === 'active')
  const trialing = all.filter(s => s.status === 'trialing')
  const canceled = all.filter(s => s.status === 'canceled' || s.status === 'past_due')

  // MRR estimate
  let mrr = 0
  for (const s of active) {
    if (s.plan === 'monthly') mrr += 9.99
    else if (s.plan === 'annual') mrr += 99 / 12
  }

  const statCards = [
    { label: 'Active', value: active.length, colour: 'text-emerald-700' },
    { label: 'Trialing', value: trialing.length, colour: 'text-amber-600' },
    { label: 'Canceled / Past due', value: canceled.length, colour: 'text-red-600' },
    { label: 'Est. MRR', value: formatGBP(mrr), colour: 'text-slate-800' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Subscriptions</h1>
        <p className="text-sm text-gray-500 mt-0.5">All subscription records</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(s => (
          <Card key={s.label} className="border-gray-200">
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.colour}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['User', 'Email', 'Status', 'Plan', 'Trial end', 'Started', 'Stripe ID'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {all.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">No subscriptions yet</td>
                  </tr>
                ) : all.map(sub => {
                  const profile = sub.profiles as any
                  return (
                    <tr key={sub.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
                        {profile?.full_name ?? <span className="text-gray-400 italic">No name</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{profile?.email ?? '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={sub.status} /></td>
                      <td className="px-4 py-3 text-gray-500 capitalize">{sub.plan ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {sub.trial_end ? (() => {
                          const d = new Date(sub.trial_end)
                          const diff = Math.ceil((d.getTime() - Date.now()) / 86400000)
                          const fmt = formatDate(sub.trial_end)
                          if (diff <= 0) return <span className="text-red-600">{fmt} (expired)</span>
                          if (diff <= 3) return <span className="text-amber-600">{fmt} ({diff}d left)</span>
                          return fmt
                        })() : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(sub.created_at)}</td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs truncate max-w-[140px]">
                        {sub.stripe_subscription_id ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
