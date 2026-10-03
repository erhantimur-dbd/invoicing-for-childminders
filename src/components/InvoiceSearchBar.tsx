'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { Search, X, SlidersHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 4 }, (_, i) => currentYear - i)

export default function InvoiceSearchBar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [showFilters, setShowFilters] = useState(false)

  const q = searchParams.get('q') ?? ''
  const month = searchParams.get('month') ?? ''
  const year = searchParams.get('year') ?? ''

  const [query, setQuery] = useState(q)
  const [syncedQ, setSyncedQ] = useState(q)
  const [pushedQ, setPushedQ] = useState<string | null>(null)
  const [externalQVersion, setExternalQVersion] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // URL `q` changed. Ignore the value we just debounced so a newer keystroke
  // is not replaced; otherwise this is Clear or history navigation.
  if (q !== syncedQ) {
    setSyncedQ(q)
    if (pushedQ === q) {
      setPushedQ(null)
    } else {
      setQuery(q)
      setPushedQ(null)
      setExternalQVersion(version => version + 1)
    }
  }

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current)
    }
  }, [])

  useEffect(() => {
    if (externalQVersion === 0) return
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [externalQVersion])

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      // Clear filter when searching
      if (key === 'q' && value) params.delete('filter')
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [router, pathname, searchParams]
  )

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const publishQuery = (value: string) => {
    setPushedQ(value)
    updateParam('q', value)
  }

  const clearAll = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setQuery('')
    setPushedQ('')
    startTransition(() => {
      router.push(pathname)
    })
  }, [router, pathname])

  const hasActiveSearch = q || month || year

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by invoice number or child name…"
            value={query}
            onChange={e => {
              const val = e.target.value
              setQuery(val)
              clearTimer()
              timerRef.current = setTimeout(() => {
                timerRef.current = null
                publishQuery(val)
              }, 350)
            }}
            className="pl-9 h-10 rounded-xl border-gray-200 text-sm focus:ring-emerald-500 focus:border-emerald-500"
          />
          {q && (
            <button
              onClick={() => {
                clearTimer()
                setQuery('')
                publishQuery('')
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-1.5 px-3 h-10 rounded-xl border text-sm font-medium transition-colors ${
            showFilters || month || year
              ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
              : 'border-gray-200 text-gray-500 hover:border-gray-300'
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
          {(month || year) && (
            <span className="bg-emerald-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {(month ? 1 : 0) + (year ? 1 : 0)}
            </span>
          )}
        </button>

        {hasActiveSearch && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 px-3 h-10 rounded-xl border border-gray-200 text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}
      </div>

      {showFilters && (
        <div className="flex gap-2 flex-wrap">
          <select
            value={month}
            onChange={e => updateParam('month', e.target.value)}
            className="h-9 px-3 rounded-xl border border-gray-200 text-sm text-gray-600 bg-white focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">All months</option>
            {MONTHS.map((m, i) => (
              <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>
            ))}
          </select>

          <select
            value={year}
            onChange={e => updateParam('year', e.target.value)}
            className="h-9 px-3 rounded-xl border border-gray-200 text-sm text-gray-600 bg-white focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">All years</option>
            {YEARS.map(y => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
        </div>
      )}

      {isPending && (
        <p className="text-xs text-gray-400">Searching…</p>
      )}
    </div>
  )
}
