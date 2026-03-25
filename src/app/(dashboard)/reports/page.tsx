'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart3, TrendingUp, TrendingDown, Download } from 'lucide-react'
import type { Expense } from '@/lib/types'

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
  // Returns 0–11 where 0 = April of taxYearStart, 11 = March of taxYearStart+1
  const m = date.getMonth() // 0=Jan...11=Dec
  const y = date.getFullYear()
  // April=3, so offset by -3, wrapping
  const offset = ((m - 3) + 12) % 12
  const taxYear = m >= 3 ? y : y - 1
  if (taxYear !== taxYearStart) return -1
  return offset
}

export default function ReportsPage() {
  const supabase = createClient()
  const taxYearOptions = generateTaxYearOptions()
  const [selectedYear, setSelectedYear] = useState(getCurrentTaxYear())
  const [invoices, setInvoices] = useState<any[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  const taxYear = getTaxYear(selectedYear)

  const load = useCallback(async () => {
    setLoading(true)
    const startStr = taxYear.start.toISOString().split('T')[0]
    const endStr = taxYear.end.toISOString().split('T')[0]

    const [{ data: invData }, { data: expData }] = await Promise.all([
      supabase
        .from('invoices')
        .select('*, children(first_name, last_name)')
        .eq('status', 'paid')
        .gte('issue_date', startStr)
        .lte('issue_date', endStr),
      supabase
        .from('expenses')
        .select('*')
        .gte('date', startStr)
        .lte('date', endStr),
    ])

    setInvoices(invData || [])
    setExpenses(expData || [])
    setLoading(false)
  }, [selectedYear])

  useEffect(() => { load() }, [load])

  // Monthly income breakdown (Apr→Mar)
  const monthlyIncome = Array(12).fill(0)
  invoices.forEach(inv => {
    const idx = getMonthKey(new Date(inv.issue_date), selectedYear)
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

  // Per child breakdown
  const byChild: Record<string, { name: string; total: number }> = {}
  invoices.forEach(inv => {
    const child = inv.children
    if (!child) return
    const name = `${child.first_name} ${child.last_name}`
    if (!byChild[name]) byChild[name] = { name, total: 0 }
    byChild[name].total += Number(inv.total)
  })
  const childBreakdown = Object.values(byChild).sort((a, b) => b.total - a.total)

  // Per category expense breakdown
  const byCategory: Record<string, number> = {}
  expenses.forEach(exp => {
    byCategory[exp.category] = (byCategory[exp.category] || 0) + Number(exp.amount)
  })

  const maxMonthly = Math.max(...monthlyIncome, ...monthlyExpenses, 1)

  async function exportCSV() {
    const startStr = taxYear.start.toISOString().split('T')[0]
    const endStr = taxYear.end.toISOString().split('T')[0]
    window.location.href = `/api/reports/export-csv?start=${startStr}&end=${endStr}&year=${selectedYear}`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tax summary</h1>
          <p className="text-gray-500 text-sm">UK tax year (6 Apr – 5 Apr)</p>
        </div>
        <Button variant="outline" className="gap-2 text-sm" onClick={exportCSV}>
          <Download className="h-4 w-4" />
          CSV
        </Button>
      </div>

      {/* Tax year selector */}
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

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* Summary cards */}
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

          {/* Monthly bar chart */}
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

          {/* Per child */}
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

          {/* Expenses by category */}
          {Object.keys(byCategory).length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Expenses by category</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amount]) => (
                  <div key={cat}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 font-medium">{cat}</span>
                      <span className="text-rose-600 font-bold">{formatGBP(amount)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-400 rounded-full"
                        style={{ width: `${(amount / totalExpenses) * 100}%` }}
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
              <p className="text-gray-400 text-sm mt-1">Paid invoices and expenses will appear here</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
