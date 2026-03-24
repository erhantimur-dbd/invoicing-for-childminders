import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import StatusBadge from '@/components/StatusBadge'
import { Plus, TrendingUp, Clock, AlertCircle, CheckCircle } from 'lucide-react'
import type { Invoice } from '@/lib/types'

function formatGBP(amount: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]

  const { data: invoices } = await supabase
    .from('invoices')
    .select('*, children(first_name, last_name), invoice_line_items(*)')
    .eq('childminder_id', user.id)
    .order('created_at', { ascending: false })

  const allInvoices: Invoice[] = invoices || []

  const totalEarnedThisMonth = allInvoices
    .filter(i => i.status === 'paid' && i.paid_at && i.paid_at >= startOfMonth)
    .reduce((sum, i) => sum + Number(i.total), 0)

  const totalEarnedThisYear = allInvoices
    .filter(i => i.status === 'paid' && i.paid_at && i.paid_at >= startOfYear)
    .reduce((sum, i) => sum + Number(i.total), 0)

  const totalOutstanding = allInvoices
    .filter(i => i.status === 'sent' || i.status === 'overdue')
    .reduce((sum, i) => sum + Number(i.total), 0)

  const overdueCount = allInvoices.filter(i => i.status === 'overdue').length
  const recentInvoices = allInvoices.slice(0, 5)

  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hi, {firstName}</h1>
          <p className="text-gray-500 text-sm">Here&apos;s your overview</p>
        </div>
        <Link href="/invoices/new">
          <Button className="bg-emerald-600 hover:bg-emerald-700 h-12 px-4 rounded-xl gap-2">
            <Plus className="h-5 w-5" />
            New Invoice
          </Button>
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <span className="text-xs text-gray-500 font-medium">This month</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{formatGBP(totalEarnedThisMonth)}</p>
            <p className="text-xs text-gray-400 mt-0.5">earned</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-gray-500 font-medium">This year</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{formatGBP(totalEarnedThisYear)}</p>
            <p className="text-xs text-gray-400 mt-0.5">earned</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-gray-500 font-medium">Outstanding</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{formatGBP(totalOutstanding)}</p>
            <p className="text-xs text-gray-400 mt-0.5">awaiting payment</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-xs text-gray-500 font-medium">Overdue</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{overdueCount}</p>
            <p className="text-xs text-gray-400 mt-0.5">{overdueCount === 1 ? 'invoice' : 'invoices'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent invoices */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">Recent invoices</h2>
          <Link href="/invoices" className="text-sm text-emerald-600 font-medium">
            View all
          </Link>
        </div>

        {recentInvoices.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-10 text-center">
              <p className="text-gray-500 mb-4">No invoices yet</p>
              <Link href="/invoices/new">
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  Create your first invoice
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentInvoices.map((invoice) => (
              <Link key={invoice.id} href={`/invoices/${invoice.id}`}>
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{invoice.invoice_number}</p>
                        <p className="text-gray-500 text-xs truncate mt-0.5">
                          {(invoice as any).children
                            ? `${(invoice as any).children.first_name} ${(invoice as any).children.last_name}`
                            : 'No child linked'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <p className="font-bold text-gray-900">{formatGBP(Number(invoice.total))}</p>
                        <StatusBadge status={invoice.status} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <Card className="border-0 shadow-sm bg-emerald-50">
        <CardContent className="p-4">
          <p className="text-sm font-medium text-emerald-800 mb-3">Quick actions</p>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/children/new">
              <Button variant="outline" className="w-full h-11 text-sm border-emerald-200 bg-white">
                Add child
              </Button>
            </Link>
            <Link href="/invoices/new">
              <Button className="w-full h-11 text-sm bg-emerald-600 hover:bg-emerald-700">
                New invoice
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
