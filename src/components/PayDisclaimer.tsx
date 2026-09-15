'use client'

import { useState } from 'react'
import { PARENT_PAY_DISCLAIMER, PAY_DISCLAIMER } from '@/lib/invoices/pay-link.mjs'

export default function PayDisclaimer({
  className = '',
  audience = 'childminder',
}: {
  className?: string
  audience?: 'childminder' | 'parent'
}) {
  const [open, setOpen] = useState(false)
  const text = audience === 'parent' ? PARENT_PAY_DISCLAIMER : PAY_DISCLAIMER

  return (
    <span className={`relative inline-flex align-middle ${className}`}>
      <button
        type="button"
        className="peer h-4 w-4 rounded-full border border-gray-300 text-[10px] leading-none text-gray-400 hover:text-gray-600 hover:border-gray-400"
        aria-label={text}
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        onBlur={() => setOpen(false)}
      >
        ?
      </button>
      <span
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 top-full z-20 mt-1 w-56 -translate-x-1/2 rounded-lg bg-gray-900 px-2.5 py-2 text-left text-[11px] font-normal leading-snug text-white shadow-lg ${
          open ? 'block' : 'hidden peer-hover:block peer-focus:block'
        }`}
      >
        {text}
      </span>
    </span>
  )
}
