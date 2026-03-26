import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-gray-400 text-xs">—</span>
  const map: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-800',
    trialing: 'bg-amber-100 text-amber-800',
    canceled: 'bg-red-100 text-red-700',
    past_due: 'bg-red-100 text-red-700',
    paused: 'bg-gray-100 text-gray-600',
    incomplete: 'bg-orange-100 text-orange-700',
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {status.replace('_', ' ')}
    </span>
  )
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default async function AdminOverviewPage() {
  const supabase = await createClient()

  // Double-check admin role
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!adminProfile || adminProfile.role !== 'admin') redirect('/dashboard')

  // Stats queries (parallel)
  const [
    { count: totalUsers },
    { count: activeCount },
    { count: trialingCount },
    { count: expiringSoonCount },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'childminder'),
    supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'trialing'),
    supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'trialing')
      .lt('trial_end', new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()),
  ])

  // Recent sign-ups: last 10 childminders with subscriptions
  const { data: recentUsers } = await supabase
    .from('profiles')
    .select('*, subscriptions(*)')
    .eq('role', 'childminder')
    .order('created_at', { ascending: false })
    .limit(10)

  // Revenue estimate
  const { data: activeSubs } = await supabase
    .from('subscriptions')
    .select('plan, status')
    .eq('status', 'active')

  let monthlyMRR = 0
  let annualMRR = 0
  for (const sub of activeSubs ?? []) {
    if (sub.plan === 'monthly') monthlyMRR += 4.99
    else if (sub.plan === 'annual') annualMRR += 54 / 12
  }
  const estimatedMRR = monthlyMRR + annualMRR

  const stats = [
    {
      label: 'Total Users',
      value: totalUsers ?? 0,
      description: 'Childminder accounts',
      color: 'text-slate-800',
    },
    {
      label: 'Active Subscriptions',
      value: activeCount ?? 0,
      description: 'Paying customers',
      color: 'text-emerald-700',
    },
    {
      label: 'Trialing',
      value: trialingCount ?? 0,
      description: 'Currently in trial',
      color: 'text-amber-700',
    },
    {
      label: 'Trials Expiring Soon',
      value: expiringSoonCount ?? 0,
      description: 'Within next 3 days',
      color: 'text-red-600',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Overview</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Platform health and recent activity
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <CardTitle className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-400 mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue estimate */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-gray-700">
            Estimated MRR
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-bold text-emerald-700">
              £{estimatedMRR.toFixed(2)}
            </span>
            <span className="text-sm text-gray-400 mb-1">/ month (estimated)</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Monthly active × £4.99 + Annual active × £4.50 (£54 ÷ 12)
          </p>
        </CardContent>
      </Card>

      {/* Recent sign-ups */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-gray-700">
            Recent Sign-ups
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Name
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Email
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Plan
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Trial Ends
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(recentUsers ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-gray-400 text-sm">
                      No users yet
                    </td>
                  </tr>
                ) : (
                  (recentUsers ?? []).map((profile) => {
                    const sub = Array.isArray(profile.subscriptions)
                      ? profile.subscriptions[0]
                      : profile.subscriptions
                    return (
                      <tr key={profile.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {profile.full_name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{profile.email}</td>
                        <td className="px-4 py-3 text-gray-500 capitalize">
                          {sub?.plan ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={sub?.status} />
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {formatDate(sub?.trial_end)}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {formatDate(profile.created_at)}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
