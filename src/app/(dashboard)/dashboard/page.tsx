import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import StatusBadge from '@/components/StatusBadge'
import { Plus, TrendingUp, Clock, AlertCircle, CheckCircle, Sparkles, Zap, ChevronRight, Receipt } from 'lucide-react'
import type { Invoice } from '@/lib/types'
import { format } from 'date-fns'

function formatGBP(amount: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)
}

const STATUS_BORDER: Record<string, string> = {
  draft: 'border-l-gray-300',
  sent: 'border-l-amber-400',
  paid: 'border-l-emerald-500',
  overdue: 'border-l-red-500',
}

const STATUS_BORDER_WIDTH = 'border-l-[6px]'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, onboarding_completed, default_bank_account_number')
    .eq('id', user.id)
    .single()

  const setupIncomplete = !profile?.onboarding_completed

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

  const { data: expensesData } = await supabase
    .from('expenses')
    .select('amount, date')
    .eq('childminder_id', user.id)
    .gte('date', startOfMonth)
  const totalExpensesThisMonth = (expensesData || []).reduce((sum, e) => sum + Number(e.amount), 0)

  const autoDrafts = allInvoices.filter(
    (i: any) => i.status === 'draft' && (i.generated_by === 'cron' || i.generated_by === 'bulk')
  )

  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const todayFormatted = format(now, 'EEEE, d MMMM yyyy')

  return (
    <div className="space-y-6">

      {/* Setup reminder banner */}
      {setupIncomplete && (
        <Link href="/onboarding">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 hover:bg-amber-100 transition-colors">
            <div className="w-9 h-9 bg-amber-400 rounded-xl flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900">Complete your setup</p>
              <p className="text-xs text-amber-700 mt-0.5">Add your bank details and children to start invoicing</p>
            </div>
            <ChevronRight className="h-4 w-4 text-amber-500 flex-shrink-0" />
          </div>
        </Link>
      )}

      {/* Auto-draft review banner */}
      {autoDrafts.length > 0 && (
        <Link href="/invoices?filter=draft">
          <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 flex items-center gap-3 hover:bg-violet-100 transition-colors">
            <div className="w-9 h-9 bg-violet-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-violet-900">
                {autoDrafts.length} invoice{autoDrafts.length !== 1 ? 's' : ''} ready to review
              </p>
              <p className="text-xs text-violet-700 mt-0.5">Auto-generated — review and send to parents</p>
            </div>
            <ChevronRight className="h-4 w-4 text-violet-400 flex-shrink-0" />
          </div>
        </Link>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hi, {firstName} 👋</h1>
          <p className="text-gray-400 text-sm mt-0.5">{todayFormatted}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href="/invoices/bulk">
            <Button variant="outline" className="h-10 px-4 rounded-xl gap-2 border-violet-200 text-violet-700 hover:bg-violet-50 text-sm font-medium">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Generate all</span>
            </Button>
          </Link>
          <Link href="/children/new">
            <Button variant="outline" className="h-10 px-4 rounded-xl gap-2 border-gray-200 text-gray-600 hover:bg-gray-50 text-sm hidden md:flex font-medium">
              <Plus className="h-4 w-4" />
              Add child
            </Button>
          </Link>
          <Link href="/invoices/new">
            <Button className="bg-emerald-600 hover:bg-emerald-700 h-10 px-4 rounded-xl gap-2 text-sm font-medium shadow-sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New invoice</span>
              <span className="sm:hidden">Invoice</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">

        <Link href="/invoices?filter=month">
          <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                </div>
                <ChevronRight className="h-4 w-4 text-gray-200 group-hover:text-emerald-400 transition-colors" />
              </div>
              <p className="text-2xl font-bold text-gray-900 tracking-tight">{formatGBP(totalEarnedThisMonth)}</p>
              <p className="text-xs text-gray-400 mt-1 font-medium">This month</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/invoices?filter=year">
          <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                </div>
                <ChevronRight className="h-4 w-4 text-gray-200 group-hover:text-blue-400 transition-colors" />
              </div>
              <p className="text-2xl font-bold text-gray-900 tracking-tight">{formatGBP(totalEarnedThisYear)}</p>
              <p className="text-xs text-gray-400 mt-1 font-medium">This year</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/invoices?filter=outstanding">
          <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                  <Clock className="h-4 w-4 text-amber-600" />
                </div>
                <ChevronRight className="h-4 w-4 text-gray-200 group-hover:text-amber-400 transition-colors" />
              </div>
              <p className="text-2xl font-bold text-gray-900 tracking-tight">{formatGBP(totalOutstanding)}</p>
              <p className="text-xs text-gray-400 mt-1 font-medium">Outstanding</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/invoices?filter=overdue">
          <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${overdueCount > 0 ? 'bg-red-100 group-hover:bg-red-200' : 'bg-gray-100 group-hover:bg-gray-200'}`}>
                  <AlertCircle className={`h-4 w-4 ${overdueCount > 0 ? 'text-red-600' : 'text-gray-400'}`} />
                </div>
                <ChevronRight className={`h-4 w-4 text-gray-200 transition-colors ${overdueCount > 0 ? 'group-hover:text-red-400' : 'group-hover:text-gray-400'}`} />
              </div>
              <p className={`text-2xl font-bold tracking-tight ${overdueCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>{overdueCount}</p>
              <p className="text-xs text-gray-400 mt-1 font-medium">Overdue</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/expenses">
          <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group overflow-hidden col-span-2 md:col-span-1">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 bg-rose-100 rounded-xl flex items-center justify-center group-hover:bg-rose-200 transition-colors">
                  <Receipt className="h-4 w-4 text-rose-600" />
                </div>
                <ChevronRight className="h-4 w-4 text-gray-200 group-hover:text-rose-400 transition-colors" />
              </div>
              <p className="text-2xl font-bold text-gray-900 tracking-tight">{formatGBP(totalExpensesThisMonth)}</p>
              <p className="text-xs text-gray-400 mt-1 font-medium">Expenses this month</p>
            </CardContent>
          </Card>
        </Link>

      </div>

      {/* Lower section: 2-col on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Recent invoices — takes 2 cols on desktop */}
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Recent invoices</h2>
            <Link href="/invoices" className="text-sm text-emerald-600 font-medium hover:text-emerald-700">
              View all →
            </Link>
          </div>

          {recentInvoices.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center">
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Plus className="h-6 w-6 text-gray-300" />
                </div>
                <p className="text-gray-500 font-medium mb-1">No invoices yet</p>
                <p className="text-gray-400 text-sm mb-4">Create your first invoice in seconds</p>
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
                  <Card className={`border-0 ${STATUS_BORDER_WIDTH} ${STATUS_BORDER[invoice.status]} shadow-sm hover:shadow-md transition-all cursor-pointer group`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm">{invoice.invoice_number}</p>
                          {invoice.status === 'draft' && (
                            <p className="text-xs text-gray-400">Awaiting review &amp; approval</p>
                          )}
                          <p className="text-gray-400 text-xs truncate mt-0.5">
                            {(invoice as any).children
                              ? `${(invoice as any).children.first_name} ${(invoice as any).children.last_name}`
                              : 'No child linked'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="font-bold text-gray-900 text-sm">{formatGBP(Number(invoice.total))}</p>
                          <StatusBadge status={invoice.status} />
                          <ChevronRight className="h-4 w-4 text-gray-200 group-hover:text-gray-400 transition-colors hidden md:block" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right sidebar: invoice status breakdown */}
        <div className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Invoice breakdown</p>
              <div className="space-y-3">
                {(['paid', 'sent', 'overdue', 'draft'] as const).map(status => {
                  const count = allInvoices.filter(i => i.status === status).length
                  const total = allInvoices.filter(i => i.status === status).reduce((s, i) => s + Number(i.total), 0)
                  return (
                    <Link key={status} href={`/invoices?filter=${status}`} className="flex items-center justify-between group hover:opacity-80 transition-opacity">
                      <StatusBadge status={status} />
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-700">{count}</p>
                        {total > 0 && <p className="text-xs text-gray-400">{formatGBP(total)}</p>}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
