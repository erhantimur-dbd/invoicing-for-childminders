import { cn } from '@/lib/utils'
import type { InvoiceStatus } from '@/lib/types'

const config: Record<InvoiceStatus, { label: string; dot: string; bg: string; text: string }> = {
  draft:   { label: 'Awaiting review',  dot: 'bg-gray-400',    bg: 'bg-gray-100',    text: 'text-gray-600' },
  sent:    { label: 'Sent',             dot: 'bg-amber-400',   bg: 'bg-amber-50',    text: 'text-amber-700' },
  paid:    { label: 'Paid',             dot: 'bg-emerald-500', bg: 'bg-emerald-50',  text: 'text-emerald-700' },
  overdue: { label: 'Overdue',          dot: 'bg-red-500',     bg: 'bg-red-50',      text: 'text-red-700' },
}

export default function StatusBadge({ status }: { status: InvoiceStatus }) {
  const { label, dot, bg, text } = config[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', bg, text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dot)} />
      {label}
    </span>
  )
}
