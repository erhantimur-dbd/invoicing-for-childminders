'use client'

import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Card } from '@/components/ui/card'
import StatusBadge from '@/components/StatusBadge'
import { Sparkles, ChevronRight } from 'lucide-react'

function formatGBP(amount: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)
}

type Props = {
  invoices: any[]
}

export default function InvoiceTable({ invoices }: Props) {
  const router = useRouter()

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Child</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Issued</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Due</th>
            <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
            <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
            <th className="px-3 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {invoices.map((invoice) => (
            <tr
              key={invoice.id}
              className="hover:bg-gray-50 transition-colors cursor-pointer group"
              onClick={() => router.push(`/invoices/${invoice.id}`)}
            >
              <td className="px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 text-sm">{invoice.invoice_number}</span>
                  {invoice.generated_by && invoice.generated_by !== 'manual' && (
                    <span title="Auto-generated"><Sparkles className="h-3 w-3 text-purple-400" /></span>
                  )}
                </div>
              </td>
              <td className="px-5 py-4 text-sm text-gray-600">
                {invoice.children
                  ? `${invoice.children.first_name} ${invoice.children.last_name}`
                  : <span className="text-gray-400">—</span>}
              </td>
              <td className="px-5 py-4 text-sm text-gray-500">
                {format(new Date(invoice.issue_date), 'd MMM yyyy')}
              </td>
              <td className="px-5 py-4 text-sm text-gray-500">
                {invoice.due_date
                  ? format(new Date(invoice.due_date), 'd MMM yyyy')
                  : <span className="text-gray-300">—</span>}
              </td>
              <td className="px-5 py-4">
                <StatusBadge status={invoice.status} />
              </td>
              <td className="px-5 py-4 text-right">
                <span className="font-bold text-gray-900">{formatGBP(Number(invoice.total))}</span>
              </td>
              <td className="px-3 py-4">
                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}
