'use client'

import { cn } from '@/lib/utils'
import type { SendMode } from '@/lib/enquiries/send-mode'

export default function SendModeToggle({
  value,
  onChange,
  disabled,
}: {
  value: SendMode
  onChange: (mode: SendMode) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-gray-900">How Dottie sends</p>
      <div className="grid sm:grid-cols-2 gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange('approve')}
          className={cn(
            'rounded-2xl border px-4 py-3 text-left transition-all',
            value === 'approve'
              ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100'
              : 'border-gray-200 bg-white hover:border-emerald-200',
            disabled && 'opacity-60',
          )}
        >
          <p className="font-semibold text-gray-900">Draft &amp; approve</p>
          <p className="text-xs text-gray-500 mt-1">Dottie writes the reply. You tap send. Nothing goes out until you approve.</p>
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange('auto')}
          className={cn(
            'rounded-2xl border px-4 py-3 text-left transition-all',
            value === 'auto'
              ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-100'
              : 'border-gray-200 bg-white hover:border-amber-200',
            disabled && 'opacity-60',
          )}
        >
          <p className="font-semibold text-gray-900">Auto-send</p>
          <p className="text-xs text-gray-500 mt-1">After a parent enquiry passes the filters, Dottie drafts and sends from your Gmail.</p>
        </button>
      </div>
      {value === 'auto' ? (
        <p className="text-xs text-amber-800">
          Auto-send only replies to filtered parent emails — not receipts or newsletters. Pause still stops drafting and sending.
        </p>
      ) : null}
    </div>
  )
}
