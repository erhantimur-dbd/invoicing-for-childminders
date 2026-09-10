'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Download, ChevronDown } from 'lucide-react'

type ExportFormat = 'summary' | 'income' | 'expenses' | 'freeagent' | 'xero' | 'quickbooks'

const GROUPS: { heading: string; items: { format: ExportFormat; label: string; hint?: string }[] }[] = [
  {
    heading: 'For your accountant',
    items: [
      { format: 'summary', label: 'Tax summary', hint: 'Income, expenses & net profit' },
      { format: 'income', label: 'Income (CSV)' },
      { format: 'expenses', label: 'Expenses (CSV)' },
    ],
  },
  {
    heading: 'For accounting software',
    items: [
      { format: 'freeagent', label: 'FreeAgent', hint: 'Bank statement CSV' },
      { format: 'xero', label: 'Xero', hint: 'Bank statement CSV' },
      { format: 'quickbooks', label: 'QuickBooks', hint: 'Bank statement CSV' },
    ],
  },
]

export default function ExportMenu({
  start,
  end,
  year,
  disabled,
}: {
  start: string
  end: string
  year: number
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  function download(format: ExportFormat) {
    window.location.href = `/api/reports/export-csv?start=${start}&end=${end}&year=${year}&format=${format}`
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="outline"
        className="gap-2 text-sm"
        onClick={() => setOpen(o => !o)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        Export
        <ChevronDown className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden py-1"
        >
          {GROUPS.map((group, gi) => (
            <div key={group.heading}>
              {gi > 0 && <div className="h-px bg-gray-100 my-1" />}
              <p className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {group.heading}
              </p>
              {group.items.map(item => (
                <button
                  key={item.format}
                  role="menuitem"
                  onClick={() => download(item.format)}
                  className="w-full text-left px-3 py-2 hover:bg-emerald-50 transition-colors"
                >
                  <span className="block text-sm font-medium text-gray-800">{item.label}</span>
                  {item.hint && <span className="block text-xs text-gray-400">{item.hint}</span>}
                </button>
              ))}
            </div>
          ))}
          <div className="h-px bg-gray-100 my-1" />
          <p className="px-3 py-2 text-xs text-gray-400 leading-relaxed">
            Software files import as a bank statement (income in, expenses out). Your accountant may map categories on their end.
          </p>
        </div>
      )}
    </div>
  )
}
