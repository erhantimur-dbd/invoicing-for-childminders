import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import StatusBadge from '@/components/StatusBadge'
import { Plus, FileText, ChevronRight, Sparkles, Zap, ChevronLeft, X } from 'lucide-react'
import { format } from 'date-fns'
import InvoiceTable from '@/components/InvoiceTable'

function formatGBP(amount: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)
}

const FILTER_LABELS: Record<string, string> = {
  month: 'Paid this month',
  year: 'Paid this year',
  outstanding: 'Outstanding invoices',
  overdue: 'Overdue invoices',
  draft: 'Drafts',
  sent: 'Sent invoices',
  paid: 'Paid invoices',
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { filter } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]

  const { data: invoices } = await supabase
    .from('invoices')
    .select('*, children(first_name, last_name)')
    .eq('childminder_id', user.id)
    .order('created_at', { ascending: false })

  const allInvoices = invoices || []

  // Apply filter
  let filtered = allInvoices
  if (filter === 'month') {
    filtered = allInvoices.filter(i => i.status === 'paid' && i.paid_at && i.paid_at >= startOfMonth)
  } else if (filter === 'year') {
    filtered = allInvoices.filter(i => i.status === 'paid' && i.paid_at && i.paid_at >= startOfYear)
  } else if (filter === 'outstanding') {
    filtered = allInvoices.filter(i => i.status === 'sent' || i.status === 'overdue')
  } else if (filter === 'overdue') {
    filtered = allInvoices.filter(i => i.status === 'overdue')
  } else if (filter === 'draft') {
    filtered = allInvoices.filter(i => i.status === 'draft')
  } else if (filter === 'sent') {
    filtered = allInvoices.filter(i => i.status === 'sent')
  } else if (filter === 'paid') {
    filtered = allInvoices.filter(i => i.status === 'paid')
  }

  const filterLabel = filter ? FILTER_LABELS[filter] : null

  // Total for filtered view
  const filteredTotal = filtered.reduce((sum, i) => sum + Number(i.total), 0)

  // Auto-draft banner (only shown when no filter active)
  const autoDrafts = allInvoices.filter(
    (inv: any) => inv.status === 'draft' && (inv.generated_by === 'cron' || inv.generated_by === 'bulk')
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {filter && (
            <Link href="/invoices" className="text-gray-400 hover:text-gray-600">
              <ChevronLeft className="h-6 w-6" />
            </Link>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {filterLabel || 'Invoices'}
            </h1>
            <p className="text-gray-500 text-sm">
              {filtered.length} invoice{filtered.length !== 1 ? 's' : ''}
              {filtered.length > 0 && filter && ` · ${formatGBP(filteredTotal)}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!filter && (
            <Link href="/invoices/bulk">
              <Button variant="outline" className="h-12 px-3 rounded-xl gap-2 border-purple-200 text-purple-700 hover:bg-purple-50">
                <Sparkles className="h-4 w-4" />
                Generate
              </Button>
            </Link>
          )}
          <Link href="/invoices/new">
            <Button className="bg-emerald-600 hover:bg-emerald-700 h-12 px-4 rounded-xl gap-2">
              <Plus className="h-5 w-5" />
              New
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter pill */}
      {filter && (
        <Link href="/invoices" className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium px-3 py-1.5 rounded-full transition-colors">
          <X className="h-3 w-3" />
          Clear filter
        </Link>
      )}

      {/* Status filter tabs — only when no filter active */}
      {!filter && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {(['outstanding', 'overdue', 'draft', 'sent', 'paid'] as const).map(f => (
            <Link
              key={f}
              href={`/invoices?filter=${f}`}
              className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border border-gray-200 text-gray-500 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 transition-colors capitalize"
            >
              {f === 'outstanding' ? 'Outstanding' : f.charAt(0).toUpperCase() + f.slice(1)}
            </Link>
          ))}
        </div>
      )}

      {/* Auto-draft banner */}
      {!filter && autoDrafts.length > 0 && (
        <Link href="/invoices?filter=draft">
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center gap-3">
            <Zap className="h-5 w-5 text-purple-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-purple-800">
                {autoDrafts.length} auto-generated draft{autoDrafts.length !== 1 ? 's' : ''} need review
              </p>
              <p className="text-xs text-purple-600">Tap to review and send</p>
            </div>
            <ChevronRight className="h-4 w-4 text-purple-400" />
          </div>
        </Link>
      )}

      {filtered.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-50 rounded-full mb-4">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-600 font-medium mb-1">
              {filter ? `No ${filterLabel?.toLowerCase()}` : 'No invoices yet'}
            </p>
            <p className="text-gray-400 text-sm mb-4">
              {filter ? 'Nothing matches this filter right now' : 'Create your first invoice in seconds'}
            </p>
            {!filter && (
              <Link href="/invoices/new">
                <Button className="bg-emerald-600 hover:bg-emerald-700">Create invoice</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="space-y-2 md:hidden">
            {filtered.map((invoice) => (
              <Link key={invoice.id} href={`/invoices/${invoice.id}`}>
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-900 text-sm">{invoice.invoice_number}</p>
                          <StatusBadge status={invoice.status} />
                          {(invoice as any).generated_by && (invoice as any).generated_by !== 'manual' && (
                            <span className="text-purple-500" title="Auto-generated"><Sparkles className="h-3 w-3" /></span>
                          )}
                        </div>
                        <p className="text-gray-500 text-sm truncate">
                          {(invoice as any).children
                            ? `${(invoice as any).children.first_name} ${(invoice as any).children.last_name}`
                            : 'No child linked'}
                        </p>
                        <p className="text-gray-400 text-xs mt-0.5">
                          {format(new Date(invoice.issue_date), 'd MMM yyyy')}
                          {invoice.due_date && ` · Due ${format(new Date(invoice.due_date), 'd MMM')}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900">{formatGBP(Number(invoice.total))}</p>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Desktop table view */}
          <div className="hidden md:block">
            <InvoiceTable invoices={filtered} />
          </div>
        </>
      )}
    </div>
  )
}
