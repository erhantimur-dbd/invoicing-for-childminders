import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Tax-year exports for accountants and accounting software.
 *
 * ?format= controls the shape:
 *   summary     — human-readable combined overview (default, back-compat)
 *   income      — clean flat table of paid invoices
 *   expenses    — clean flat table of expenses
 *   freeagent   — FreeAgent bank-statement CSV  (Date, Amount, Description)
 *   xero        — Xero bank-statement CSV        (Date, Amount, Payee, Description, Reference)
 *   quickbooks  — QuickBooks 3-column bank CSV   (Date, Description, Amount)
 *
 * The platform formats are deliberately bank-statement style: income as a
 * positive line, expenses as a negative line. For cash-basis sole traders
 * (which childminders are) this imports cleanly into every package and
 * reconciles like a bank feed — far more reliable than each platform's
 * account-code-dependent invoice/bill import template.
 */

type Format = 'summary' | 'income' | 'expenses' | 'freeagent' | 'xero' | 'quickbooks'
const FORMATS: Format[] = ['summary', 'income', 'expenses', 'freeagent', 'xero', 'quickbooks']

function csvCell(val: string | number | null | undefined): string {
  const str = String(val ?? '')
  return str.includes(',') || str.includes('"') || str.includes('\n')
    ? `"${str.replace(/"/g, '""')}"`
    : str
}

function toCSV(rows: Record<string, string | number | null>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  return [
    headers.join(','),
    ...rows.map(row => headers.map(h => csvCell(row[h])).join(',')),
  ].join('\n')
}

// UK accounting software expects dd/mm/yyyy.
function ddmmyyyy(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return String(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()}`
}

type IncomeItem = {
  date: string
  invoiceNumber: string
  child: string
  parent: string
  amount: number
  paymentMethod: string
}
type ExpenseItem = {
  date: string
  description: string
  category: string
  amount: number
  notes: string
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const start = searchParams.get('start')
  const end = searchParams.get('end')
  const year = searchParams.get('year') || ''
  const formatParam = (searchParams.get('format') || 'summary') as Format
  const format: Format = FORMATS.includes(formatParam) ? formatParam : 'summary'

  if (!start || !end) return NextResponse.json({ error: 'Missing date range' }, { status: 400 })

  const [{ data: invoices }, { data: expenses }] = await Promise.all([
    supabase
      .from('invoices')
      .select('invoice_number, issue_date, due_date, status, total, payment_method, children(first_name, last_name, parent_name)')
      .eq('childminder_id', user.id)
      .eq('status', 'paid')
      .gte('issue_date', start)
      .lte('issue_date', end)
      .order('issue_date'),
    supabase
      .from('expenses')
      .select('date, description, category, amount, notes')
      .eq('childminder_id', user.id)
      .gte('date', start)
      .lte('date', end)
      .order('date'),
  ])

  const income: IncomeItem[] = (invoices || []).map((inv: any) => ({
    date: inv.issue_date,
    invoiceNumber: inv.invoice_number,
    child: inv.children ? `${inv.children.first_name} ${inv.children.last_name}`.trim() : '',
    parent: inv.children?.parent_name || '',
    amount: Number(inv.total),
    paymentMethod: inv.payment_method || '',
  }))

  const exp: ExpenseItem[] = (expenses || []).map((e: any) => ({
    date: e.date,
    description: e.description || '',
    category: e.category || '',
    amount: Number(e.amount),
    notes: e.notes || '',
  }))

  const taxLabel = year ? `${year}-${String(Number(year) + 1).slice(2)}` : 'export'

  const { csv, filename } = build(format, income, exp, taxLabel)

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

function build(
  format: Format,
  income: IncomeItem[],
  exp: ExpenseItem[],
  taxLabel: string
): { csv: string; filename: string } {
  switch (format) {
    case 'income': {
      const rows = income.map(i => ({
        Date: ddmmyyyy(i.date),
        'Invoice Number': i.invoiceNumber,
        Client: i.child,
        Parent: i.parent,
        'Amount (£)': i.amount.toFixed(2),
        'Payment Method': i.paymentMethod,
      }))
      return { csv: toCSV(rows), filename: `income-${taxLabel}.csv` }
    }

    case 'expenses': {
      const rows = exp.map(e => ({
        Date: ddmmyyyy(e.date),
        Description: e.description,
        Category: e.category,
        'Amount (£)': e.amount.toFixed(2),
        Notes: e.notes,
      }))
      return { csv: toCSV(rows), filename: `expenses-${taxLabel}.csv` }
    }

    // ── Bank-statement style: income positive, expenses negative ──────────
    case 'freeagent': {
      const rows = [
        ...income.map(i => ({ d: i.date, amount: i.amount, desc: incomeDesc(i) })),
        ...exp.map(e => ({ d: e.date, amount: -e.amount, desc: expenseDesc(e) })),
      ]
        .sort((a, b) => a.d.localeCompare(b.d))
        .map(r => ({ Date: ddmmyyyy(r.d), Amount: r.amount.toFixed(2), Description: r.desc }))
      return { csv: toCSV(rows), filename: `freeagent-bank-${taxLabel}.csv` }
    }

    case 'xero': {
      const rows = [
        ...income.map(i => ({ d: i.date, amount: i.amount, payee: i.parent || i.child, desc: incomeDesc(i), ref: i.invoiceNumber })),
        ...exp.map(e => ({ d: e.date, amount: -e.amount, payee: '', desc: expenseDesc(e), ref: '' })),
      ]
        .sort((a, b) => a.d.localeCompare(b.d))
        .map(r => ({
          Date: ddmmyyyy(r.d),
          Amount: r.amount.toFixed(2),
          Payee: r.payee,
          Description: r.desc,
          Reference: r.ref,
        }))
      return { csv: toCSV(rows), filename: `xero-bank-${taxLabel}.csv` }
    }

    case 'quickbooks': {
      const rows = [
        ...income.map(i => ({ d: i.date, amount: i.amount, desc: incomeDesc(i) })),
        ...exp.map(e => ({ d: e.date, amount: -e.amount, desc: expenseDesc(e) })),
      ]
        .sort((a, b) => a.d.localeCompare(b.d))
        .map(r => ({ Date: ddmmyyyy(r.d), Description: r.desc, Amount: r.amount.toFixed(2) }))
      return { csv: toCSV(rows), filename: `quickbooks-bank-${taxLabel}.csv` }
    }

    // ── Human-readable combined summary (default, back-compat) ────────────
    case 'summary':
    default: {
      const incomeRows = income.map(i => ({
        'Invoice Number': i.invoiceNumber,
        Date: ddmmyyyy(i.date),
        Child: i.child,
        Parent: i.parent,
        'Amount (£)': i.amount.toFixed(2),
        'Payment Method': i.paymentMethod,
      }))
      const expenseRows = exp.map(e => ({
        Date: ddmmyyyy(e.date),
        Description: e.description,
        Category: e.category,
        'Amount (£)': e.amount.toFixed(2),
        Notes: e.notes,
      }))
      const incomeTotal = income.reduce((s, i) => s + i.amount, 0)
      const expenseTotal = exp.reduce((s, e) => s + e.amount, 0)
      const csv = [
        `CHILDMINDER TAX SUMMARY - Tax Year ${taxLabel}`,
        `Generated: ${new Date().toLocaleDateString('en-GB')}`,
        '',
        '=== INCOME (Paid Invoices) ===',
        toCSV(incomeRows),
        `Total Income,,,,${incomeTotal.toFixed(2)}`,
        '',
        '=== EXPENSES ===',
        toCSV(expenseRows),
        `Total Expenses,,,,${expenseTotal.toFixed(2)}`,
        '',
        `NET PROFIT,,,,${(incomeTotal - expenseTotal).toFixed(2)}`,
      ].join('\n')
      return { csv, filename: `tax-summary-${taxLabel}.csv` }
    }
  }
}

function incomeDesc(i: IncomeItem): string {
  const who = i.child || i.parent
  return `Invoice ${i.invoiceNumber}${who ? ` — ${who}` : ''}`.trim()
}

function expenseDesc(e: ExpenseItem): string {
  if (e.category && e.description) return `${e.category} — ${e.description}`
  return e.description || e.category || 'Expense'
}
