import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { InvoiceStatus } from '@/lib/types'

const config: Record<InvoiceStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-600 hover:bg-gray-100' },
  sent: { label: 'Sent', className: 'bg-amber-100 text-amber-700 hover:bg-amber-100' },
  paid: { label: 'Paid', className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' },
  overdue: { label: 'Overdue', className: 'bg-red-100 text-red-700 hover:bg-red-100' },
}

export default function StatusBadge({ status }: { status: InvoiceStatus }) {
  const { label, className } = config[status]
  return <Badge className={cn('font-medium text-sm px-3 py-1', className)}>{label}</Badge>
}
