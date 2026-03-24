import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import StatusBadge from '@/components/StatusBadge'
import { Plus, FileText, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'

function formatGBP(amount: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)
}

export default async function InvoicesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: invoices } = await supabase
    .from('invoices')
    .select('*, children(first_name, last_name)')
    .eq('childminder_id', user.id)
    .order('created_at', { ascending: false })

  const allInvoices = invoices || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-500 text-sm">{allInvoices.length} total</p>
        </div>
        <Link href="/invoices/new">
          <Button className="bg-emerald-600 hover:bg-emerald-700 h-12 px-4 rounded-xl gap-2">
            <Plus className="h-5 w-5" />
            New
          </Button>
        </Link>
      </div>

      {allInvoices.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-50 rounded-full mb-4">
              <FileText className="h-8 w-8 text-emerald-600" />
            </div>
            <p className="text-gray-600 font-medium mb-1">No invoices yet</p>
            <p className="text-gray-400 text-sm mb-4">Create your first invoice in seconds</p>
            <Link href="/invoices/new">
              <Button className="bg-emerald-600 hover:bg-emerald-700">Create invoice</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {allInvoices.map((invoice) => (
            <Link key={invoice.id} href={`/invoices/${invoice.id}`}>
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-900 text-sm">{invoice.invoice_number}</p>
                        <StatusBadge status={invoice.status} />
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
      )}
    </div>
  )
}
