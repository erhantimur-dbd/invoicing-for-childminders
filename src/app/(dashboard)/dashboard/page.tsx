import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import StatusBadge from '@/components/StatusBadge'
import { Plus, TrendingUp, Clock, AlertCircle, CheckCircle, Sparkles, Zap, ChevronRight } from 'lucide-react'
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

  // Auto-generated drafts awaiting review
  const autoDrafts = allInvoices.filter(
    (i: any) => i.status === 'draft' && (i.generated_by === 'cron' || i.generated_by === 'bulk')
  )

  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  return (
    <div className="space-y-6">
      {/* Setup reminder banner */}
      {setupIncomplete && (
        <Link href="/onboarding">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 hover:bg-amber-100 transition-colors">
            <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900">Complete your setup</p>
              <p className="text-xs text-amber-700">Add your bank details and children to start invoicing</p>
            </div>
            <Plus className="h-4 w-4 text-amber-600 flex-shrink-0" />
          </div>
        </Link>
      )}

      {/* Auto-draft review banner */}
      {autoDrafts.length > 0 && (
        <Link href="/invoices">
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center gap-3 hover:bg-purple-100 transition-colors">
            <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Zap className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-purple-900">
                {autoDrafts.length} invoice{autoDrafts.length !== 1 ? 's' : ''} ready to review
              </p>
              <p className="text-xs text-purple-700">Auto-generated — review and send to parents</p>
            </div>
            <ChevronRight className="h-4 w-4 text-purple-400 flex-shrink-0" />
          </div>
        </Link>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hi, {firstName}</h1>
          <p className="text-gray-500 text-sm">Here&apos;s your overview</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href="/invoices/bulk">
            <Button variant="outline" className="h-10 px-4 rounded-xl gap-2 border-purple-200 text-purple-700 hover:bg-purple-50 text-sm">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Generate all</span>
            </Button>
          </Link>
          <Link href="/children/new">
            <Button variant="outline" className="h-10 px-4 rounded-xl gap-2 border-gray-200 text-gray-600 hover:bg-gray-50 text-sm hidden md:flex">
              <Plus className="h-4 w-4" />
              Add child
            </Button>
          </Link>
          <Link href="/invoices/new">
            <Button className="bg-emerald-600 hover:bg-emerald-700 h-10 px-4 rounded-xl gap-2 text-sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New invoice</span>
              <span className="sm:hidden">Invoice</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link href="/invoices?filter=month">
          <Card className="border-0 shadow-sm hover:shadow-md transition-all hover:bg-emerald-50 cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs text-gray-500 font-medium">This month</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
              </div>
              <p className="text-xl font-bold text-gray-900">{formatGBP(totalEarnedThisMonth)}</p>
              <p className="text-xs text-gray-400 mt-0.5">earned</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/invoices?filter=year">
          <Card className="border-0 shadow-sm hover:shadow-md transition-all hover:bg-blue-50 cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-500" />
                  <span className="text-xs text-gray-500 font-medium">This year</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
              </div>
              <p className="text-xl font-bold text-gray-900">{formatGBP(totalEarnedThisYear)}</p>
              <p className="text-xs text-gray-400 mt-0.5">earned</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/invoices?filter=outstanding">
          <Card className="border-0 shadow-sm hover:shadow-md transition-all hover:bg-amber-50 cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span className="text-xs text-gray-500 font-medium">Outstanding</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
              </div>
              <p className="text-xl font-bold text-gray-900">{formatGBP(totalOutstanding)}</p>
              <p className="text-xs text-gray-400 mt-0.5">awaiting payment</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/invoices?filter=overdue">
          <Card className={`border-0 shadow-sm hover:shadow-md transition-all cursor-pointer ${overdueCount > 0 ? 'hover:bg-red-50' : 'hover:bg-gray-50'}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <AlertCircle className={`h-4 w-4 ${overdueCount > 0 ? 'text-red-500' : 'text-gray-400'}`} />
                  <span className="text-xs text-gray-500 font-medium">Overdue</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
              </div>
              <p className={`text-xl font-bold ${overdueCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>{overdueCount}</p>
              <p className="text-xs text-gray-400 mt-0.5">{overdueCount === 1 ? 'invoice' : 'invoices'}</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Lower section: 2-col on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Recent invoices — takes 2 cols on desktop */}
        <div className="md:col-span-2">
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
                        <div className="flex items-center gap-3">
                          <p className="font-bold text-gray-900">{formatGBP(Number(invoice.total))}</p>
                          <StatusBadge status={invoice.status} />
                          <ChevronRight className="h-4 w-4 text-gray-300 hidden md:block" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right sidebar: quick actions + summary */}
        <div className="space-y-4">
          <Card className="border-0 shadow-sm bg-emerald-50">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-emerald-800 mb-3">Quick actions</p>
              <div className="space-y-2">
                <Link href="/invoices/new">
                  <Button className="w-full h-11 text-sm bg-emerald-600 hover:bg-emerald-700 gap-2">
                    <Plus className="h-4 w-4" />
                    New invoice
                  </Button>
                </Link>
                <Link href="/invoices/bulk">
                  <Button variant="outline" className="w-full h-11 text-sm border-purple-200 text-purple-700 bg-white hover:bg-purple-50 gap-2">
                    <Sparkles className="h-4 w-4" />
                    Generate all
                  </Button>
                </Link>
                <Link href="/children/new">
                  <Button variant="outline" className="w-full h-11 text-sm border-gray-200 text-gray-600 bg-white hover:bg-gray-50 gap-2">
                    <Plus className="h-4 w-4" />
                    Add child
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-800">Invoice status</p>
              {(['draft', 'sent', 'overdue', 'paid'] as const).map(status => {
                const count = allInvoices.filter(i => i.status === status).length
                return (
                  <Link key={status} href={`/invoices?filter=${status}`} className="flex items-center justify-between hover:opacity-70 transition-opacity">
                    <StatusBadge status={status} />
                    <span className="text-sm font-semibold text-gray-700">{count}</span>
                  </Link>
                )
              })}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
