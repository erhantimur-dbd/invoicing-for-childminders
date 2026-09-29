'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart3, TrendingUp, TrendingDown, Download, Receipt, FileSpreadsheet, RefreshCw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Expense } from '@/lib/types'
import { EXPENSE_CATEGORY_EMOJI } from '@/lib/types'
import {
  type AccountingBasis,
  type InvoiceForExport,
  invoiceInPeriod,
  invoiceAccountingDate,
  loadXeroSettingsFromStorage,
  mergeXeroSettings,
} from '@/lib/xero-export'

type DownloadFormat = 'summary' | 'xero-invoices' | 'xero-expenses'

function formatGBP(amount: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)
}

// UK tax year: 6 Apr → 5 Apr
function getTaxYear(year: number) {
  return {
    start: new Date(`${year}-04-06`),
    end: new Date(`${year + 1}-04-05`),
    label: `${year}/${String(year + 1).slice(2)}`,
  }
}

function getCurrentTaxYear() {
  const now = new Date()
  const year = now >= new Date(`${now.getFullYear()}-04-06`) ? now.getFullYear() : now.getFullYear() - 1
  return year
}

function generateTaxYearOptions() {
  const current = getCurrentTaxYear()
  return [current, current - 1, current - 2, current - 3].map(y => ({ ...getTaxYear(y), year: y }))
}

const MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']

function getMonthKey(date: Date, taxYearStart: number): number {
  const m = date.getMonth()
  const y = date.getFullYear()
  const offset = ((m - 3) + 12) % 12
  const taxYear = m >= 3 ? y : y - 1
  if (taxYear !== taxYearStart) return -1
  return offset
}

const PIE_COLOURS = [
  '#059669', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
  '#06b6d4', '#d946ef', '#78716c', '#64748b',
]

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const toRad = (deg: number) => (deg - 90) * (Math.PI / 180)
  const x1 = cx + r * Math.cos(toRad(startAngle))
  const y1 = cy + r * Math.sin(toRad(startAngle))
  const x2 = cx + r * Math.cos(toRad(endAngle))
  const y2 = cy + r * Math.sin(toRad(endAngle))
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`
}

function PieChart({ data }: { data: { label: string; value: number; colour: string }[] }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return null

  const cx = 80
  const cy = 80
  const r = 70

  const slices = data.reduce<
    { label: string; value: number; colour: string; start: number; end: number; angle: number; index: number }[]
  >((acc, d, i) => {
    const angle = (d.value / total) * 360
    const start = acc.length ? acc[acc.length - 1].end : 0
    acc.push({ ...d, start, end: start + angle, angle, index: i })
    return acc
  }, [])

  return (
    <svg viewBox="0 0 160 160" className="w-full max-w-[160px]">
      {slices.map((s) => (
        <path
          key={s.label}
          d={describeArc(cx, cy, hovered === s.index ? r + 5 : r, s.start, s.end)}
          fill={s.colour}
          opacity={hovered !== null && hovered !== s.index ? 0.55 : 1}
          className="transition-all duration-150 cursor-pointer"
          onMouseEnter={() => setHovered(s.index)}
          onMouseLeave={() => setHovered(null)}
        />
      ))}
      <circle cx={cx} cy={cy} r={36} fill="white" />
      {hovered !== null ? (
        <>
          <text x={cx} y={cy - 6} textAnchor="middle" fontSize="10" fill="#374151" fontWeight="700">
            {((slices[hovered].value / total) * 100).toFixed(0)}%
          </text>
          <text x={cx} y={cy + 8} textAnchor="middle" fontSize="7" fill="#9CA3AF">
            {slices[hovered].label.slice(0, 10)}
          </text>
        </>
      ) : (
        <>
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize="9" fill="#6B7280">Total</text>
          <text x={cx} y={cy + 9} textAnchor="middle" fontSize="9" fill="#374151" fontWeight="700">
            {data.length}
          </text>
          <text x={cx} y={cy + 20} textAnchor="middle" fontSize="7" fill="#9CA3AF">categories</text>
        </>
      )}
    </svg>
  )
}

export default function ReportsPage() {
  const taxYearOptions = generateTaxYearOptions()
  const [selectedYear, setSelectedYear] = useState(getCurrentTaxYear())
  const [basis, setBasis] = useState<AccountingBasis>('cash')
  const [allInvoices, setAllInvoices] = useState<InvoiceForExport[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const taxYear = getTaxYear(selectedYear)
  const startStr = taxYear.start.toISOString().split('T')[0]
  const endStr = taxYear.end.toISOString().split('T')[0]

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    async function load() {
      setLoading(true)
      const [{ data: invData }, { data: expData }] = await Promise.all([
        supabase
          .from('invoices')
          .select('*, children(first_name, last_name, parent_name), invoice_line_items(description, quantity, unit_price, amount, is_funded)')
          .neq('status', 'draft'),
        supabase
          .from('expenses')
          .select('*')
          .gte('date', startStr)
          .lte('date', endStr),
      ])
      if (cancelled) return
      setAllInvoices((invData || []) as InvoiceForExport[])
      setExpenses(expData || [])
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [selectedYear, startStr, endStr])

  const invoices = allInvoices.filter(inv => invoiceInPeriod(inv, startStr, endStr, basis))

  const monthlyIncome = Array(12).fill(0)
  invoices.forEach(inv => {
    const dateStr = invoiceAccountingDate(inv, basis)
    if (!dateStr) return
    const idx = getMonthKey(new Date(dateStr), selectedYear)
    if (idx >= 0) monthlyIncome[idx] += Number(inv.total)
  })

  const monthlyExpenses = Array(12).fill(0)
  expenses.forEach(exp => {
    const idx = getMonthKey(new Date(exp.date), selectedYear)
    if (idx >= 0) monthlyExpenses[idx] += Number(exp.amount)
  })

  const totalIncome = invoices.reduce((s, i) => s + Number(i.total), 0)
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const netProfit = totalIncome - totalExpenses

  const byChild: Record<string, { name: string; total: number }> = {}
  invoices.forEach(inv => {
    const child = inv.children
    if (!child) return
    const name = `${child.first_name} ${child.last_name}`
    if (!byChild[name]) byChild[name] = { name, total: 0 }
    byChild[name].total += Number(inv.total)
  })
  const childBreakdown = Object.values(byChild).sort((a, b) => b.total - a.total)

  const byCategory: Record<string, number> = {}
  expenses.forEach(exp => {
    byCategory[exp.category] = (byCategory[exp.category] || 0) + Number(exp.amount)
  })
  const categoryEntries = Object.entries(byCategory).sort((a, b) => b[1] - a[1])

  const pieData = categoryEntries.map(([label, value], i) => ({
    label,
    value,
    colour: PIE_COLOURS[i % PIE_COLOURS.length],
  }))

  const avgExpense = expenses.length > 0 ? totalExpenses / expenses.length : 0
  const topCategory = categoryEntries[0]

  const maxMonthly = Math.max(...monthlyIncome, ...monthlyExpenses, 1)

  function exportCSV(format: DownloadFormat) {
    const settings = mergeXeroSettings(loadXeroSettingsFromStorage())
    const params = new URLSearchParams({
      start: startStr,
      end: endStr,
      year: String(selectedYear),
      basis,
      format,
      salesAccount: settings.salesAccountCode,
      expenseAccount: settings.defaultExpenseAccountCode,
      taxType: settings.taxType,
    })
    window.location.href = `/api/reports/export-csv?${params.toString()}`
  }

  async function syncToXero() {
    setSyncing(true)
    try {
      const res = await fetch('/api/xero/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start: startStr, end: endStr, basis }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Sync failed')
      const msg =
        `Synced ${data.invoicesSynced} invoices, ${data.expensesSynced} expenses` +
        (data.invoicesSkipped + data.expensesSkipped
          ? ` (${data.invoicesSkipped + data.expensesSkipped} already synced)`
          : '')
      if (data.errors?.length) {
        toast.warning(`${msg}. ${data.errors.length} error(s).`)
        console.warn('Xero sync errors', data.errors)
      } else {
        toast.success(msg)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tax summary</h1>
        <p className="text-gray-500 text-sm">UK tax year (6 Apr – 5 Apr)</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
          <SelectTrigger className="h-12 text-base">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {taxYearOptions.map(opt => (
              <SelectItem key={opt.year} value={String(opt.year)}>
                Tax year {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex rounded-xl bg-gray-100 p-1 h-12">
          {([
            { value: 'cash' as const, label: 'Cash basis' },
            { value: 'accrual' as const, label: 'Accrual' },
          ]).map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setBasis(opt.value)}
              className={`flex-1 rounded-lg text-sm font-medium transition-colors ${
                basis === opt.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400 -mt-1">
        {basis === 'cash'
          ? 'Income counted when marked paid (recommended for most childminders).'
          : 'Income counted on invoice issue date, including unpaid sent invoices.'}
      </p>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            </div>
            Export
          </CardTitle>
          <p className="text-xs text-gray-500 mt-1">
            CSV downloads, or push drafts to Xero (connect in Settings). Account codes must match your chart.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" className="gap-2 text-sm flex-1" onClick={() => exportCSV('summary')}>
              <Download className="h-4 w-4" />
              Accountant summary
            </Button>
            <Button variant="outline" className="gap-2 text-sm flex-1" onClick={() => exportCSV('xero-invoices')}>
              <Download className="h-4 w-4" />
              Xero invoices
            </Button>
            <Button variant="outline" className="gap-2 text-sm flex-1" onClick={() => exportCSV('xero-expenses')}>
              <Download className="h-4 w-4" />
              Xero expenses
            </Button>
          </div>
          <Button
            className="w-full gap-2 text-sm h-11 bg-sky-600 hover:bg-sky-700"
            disabled={syncing}
            onClick={syncToXero}
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Sync selected year to Xero
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-0 shadow-sm bg-emerald-50">
              <CardContent className="p-4">
                <TrendingUp className="h-5 w-5 text-emerald-600 mb-2" />
                <p className="text-xs text-emerald-600 font-medium">Income</p>
                <p className="text-lg font-bold text-emerald-700">{formatGBP(totalIncome)}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-rose-50">
              <CardContent className="p-4">
                <TrendingDown className="h-5 w-5 text-rose-600 mb-2" />
                <p className="text-xs text-rose-600 font-medium">Expenses</p>
                <p className="text-lg font-bold text-rose-700">{formatGBP(totalExpenses)}</p>
              </CardContent>
            </Card>
            <Card className={`border-0 shadow-sm ${netProfit >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
              <CardContent className="p-4">
                <BarChart3 className={`h-5 w-5 mb-2 ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
                <p className={`text-xs font-medium ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>Net profit</p>
                <p className={`text-lg font-bold ${netProfit >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>{formatGBP(netProfit)}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Month by month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-1 h-32">
                {MONTHS.map((month, idx) => (
                  <div key={month} className="flex-1 flex flex-col items-center gap-0.5">
                    <div className="w-full flex flex-col justify-end gap-0.5" style={{ height: '100px' }}>
                      <div
                        className="w-full bg-emerald-400 rounded-t"
                        style={{ height: `${(monthlyIncome[idx] / maxMonthly) * 100}px`, minHeight: monthlyIncome[idx] > 0 ? '2px' : '0' }}
                      />
                      <div
                        className="w-full bg-rose-300 rounded-t"
                        style={{ height: `${(monthlyExpenses[idx] / maxMonthly) * 100}px`, minHeight: monthlyExpenses[idx] > 0 ? '2px' : '0' }}
                      />
                    </div>
                    <span className="text-[9px] text-gray-400">{month}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-2">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <div className="w-3 h-3 rounded-sm bg-emerald-400" /> Income
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <div className="w-3 h-3 rounded-sm bg-rose-300" /> Expenses
                </div>
              </div>
            </CardContent>
          </Card>

          {expenses.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-7 h-7 bg-rose-100 rounded-lg flex items-center justify-center">
                    <Receipt className="h-4 w-4 text-rose-600" />
                  </div>
                  Expense breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-gray-900">{expenses.length}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Total expenses</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-gray-900">{formatGBP(avgExpense)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Avg per expense</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-sm font-bold text-gray-900 leading-tight">
                      {topCategory ? (EXPENSE_CATEGORY_EMOJI[topCategory[0]] ?? '') + ' ' + topCategory[0].split(' ')[0] : '—'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Top category</p>
                  </div>
                </div>

                <div className="flex items-start gap-5">
                  <div className="flex-shrink-0 w-36">
                    <PieChart data={pieData} />
                  </div>
                  <div className="flex-1 space-y-2 min-w-0">
                    {pieData.map((slice) => {
                      const pct = totalExpenses > 0 ? ((slice.value / totalExpenses) * 100).toFixed(1) : '0'
                      const emoji = EXPENSE_CATEGORY_EMOJI[slice.label] ?? '📦'
                      return (
                        <div key={slice.label} className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: slice.colour }}
                          />
                          <span className="text-xs text-gray-700 truncate flex-1">
                            {emoji} {slice.label}
                          </span>
                          <span className="text-xs font-semibold text-gray-900 flex-shrink-0">
                            {pct}%
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-3 pt-1 border-t border-gray-50">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">By category</p>
                  {categoryEntries.map(([cat, amount], i) => {
                    const emoji = EXPENSE_CATEGORY_EMOJI[cat] ?? '📦'
                    const colour = PIE_COLOURS[i % PIE_COLOURS.length]
                    return (
                      <div key={cat}>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="text-gray-700 font-medium">{emoji} {cat}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">
                              {totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : '0'}%
                            </span>
                            <span className="font-bold" style={{ color: colour }}>{formatGBP(amount)}</span>
                          </div>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${(amount / totalExpenses) * 100}%`,
                              backgroundColor: colour,
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {childBreakdown.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Income by child</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {childBreakdown.map(({ name, total }) => (
                  <div key={name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 font-medium">{name}</span>
                      <span className="text-emerald-600 font-bold">{formatGBP(total)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${(total / totalIncome) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {invoices.length === 0 && expenses.length === 0 && (
            <div className="text-center py-16">
              <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No data for this tax year</p>
              <p className="text-gray-400 text-sm mt-1">
                {basis === 'cash'
                  ? 'Paid invoices and expenses will appear here'
                  : 'Sent or paid invoices and expenses will appear here'}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
