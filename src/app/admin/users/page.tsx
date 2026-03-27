import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function SubStatusBadge({ status }: { status: string | null | undefined }) {
  if (!status)
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
        none
      </span>
    )

  const styles: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-800',
    trialing: 'bg-amber-100 text-amber-800',
    canceled: 'bg-gray-100 text-gray-500',
    past_due: 'bg-red-100 text-red-700',
    paused: 'bg-gray-100 text-gray-500',
    incomplete: 'bg-orange-100 text-orange-700',
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? 'bg-gray-100 text-gray-500'}`}
    >
      {status.replace('_', ' ')}
    </span>
  )
}

function RoleBadge({ role }: { role: string | null | undefined }) {
  if (role === 'admin') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-white">
        admin
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
      childminder
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

function formatTrialEnd(dateStr: string | null | undefined) {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const formatted = formatDate(dateStr)
  if (diffDays <= 0) return <span className="text-red-600">{formatted} (expired)</span>
  if (diffDays <= 3) return <span className="text-amber-600">{formatted} ({diffDays}d left)</span>
  return <span>{formatted}</span>
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const supabase = await createClient()

  // Auth check — uses regular client (RLS applies to current user only)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: adminProfile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!adminProfile || adminProfile.role !== 'admin') redirect('/dashboard')

  // Data queries — service role client bypasses RLS
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { q } = await searchParams

  // Fetch all users with subscriptions
  const { data: allUsers } = await admin
    .from('profiles')
    .select('*, subscriptions(*)')
    .order('created_at', { ascending: false })

  // Fetch invoice counts per childminder
  const { data: invoiceRows } = await admin
    .from('invoices')
    .select('childminder_id')

  const invoiceCountMap: Record<string, number> = {}
  for (const row of invoiceRows ?? []) {
    if (row.childminder_id) {
      invoiceCountMap[row.childminder_id] =
        (invoiceCountMap[row.childminder_id] ?? 0) + 1
    }
  }

  // Filter by search query
  const query = q?.toLowerCase().trim() ?? ''
  const users = (allUsers ?? []).filter((u) => {
    if (!query) return true
    return (
      u.full_name?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query)
    )
  })

  // Summary counts (from all users, not filtered)
  const allChildminders = (allUsers ?? []).filter((u) => u.role === 'childminder')
  const totalCount = allChildminders.length
  const activeCount = allChildminders.filter((u) => {
    const sub = Array.isArray(u.subscriptions) ? u.subscriptions[0] : u.subscriptions
    return sub?.status === 'active'
  }).length
  const trialingCount = allChildminders.filter((u) => {
    const sub = Array.isArray(u.subscriptions) ? u.subscriptions[0] : u.subscriptions
    return sub?.status === 'trialing'
  }).length
  const expiredCount = allChildminders.filter((u) => {
    const sub = Array.isArray(u.subscriptions) ? u.subscriptions[0] : u.subscriptions
    return sub?.status === 'canceled' || sub?.status === 'past_due'
  }).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Users</h1>
        <p className="text-sm text-gray-500 mt-0.5">All registered accounts</p>
      </div>

      {/* Summary bar */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg px-4 py-3">
        <span>
          <span className="font-semibold text-gray-900">{totalCount}</span> total users
        </span>
        <span className="text-gray-300">·</span>
        <span>
          <span className="font-semibold text-emerald-700">{activeCount}</span> active
        </span>
        <span className="text-gray-300">·</span>
        <span>
          <span className="font-semibold text-amber-600">{trialingCount}</span> trialing
        </span>
        <span className="text-gray-300">·</span>
        <span>
          <span className="font-semibold text-red-600">{expiredCount}</span> expired / canceled
        </span>
      </div>

      {/* Search */}
      <form method="GET" className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search by name or email..."
          className="flex-1 max-w-sm text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
        >
          Search
        </button>
        {q && (
          <Link
            href="/admin/users"
            className="px-4 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Users table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Email
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Role
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Sub Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Plan
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Trial End
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Invoices
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Joined
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-8 text-center text-gray-400 text-sm"
                    >
                      {query ? `No users matching "${q}"` : 'No users found'}
                    </td>
                  </tr>
                ) : (
                  users.map((profile) => {
                    const sub = Array.isArray(profile.subscriptions)
                      ? profile.subscriptions[0]
                      : profile.subscriptions
                    const invoiceCount = invoiceCountMap[profile.id] ?? 0

                    return (
                      <tr
                        key={profile.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
                          {profile.full_name ?? (
                            <span className="text-gray-400 italic">No name</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {profile.email}
                        </td>
                        <td className="px-4 py-3">
                          <RoleBadge role={profile.role} />
                        </td>
                        <td className="px-4 py-3">
                          <SubStatusBadge status={sub?.status} />
                        </td>
                        <td className="px-4 py-3 text-gray-500 capitalize">
                          {sub?.plan ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {formatTrialEnd(sub?.trial_end)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`font-medium ${invoiceCount > 0 ? 'text-gray-800' : 'text-gray-300'}`}
                          >
                            {invoiceCount}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {formatDate(profile.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/users/${profile.id}`}
                            className="text-emerald-600 hover:text-emerald-800 font-medium text-xs hover:underline"
                          >
                            View
                          </Link>
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

      {query && (
        <p className="text-xs text-gray-400">
          Showing {users.length} result{users.length !== 1 ? 's' : ''} for &quot;{q}&quot;
        </p>
      )}
    </div>
  )
}
