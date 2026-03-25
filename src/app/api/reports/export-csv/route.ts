import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function toCSV(rows: Record<string, string | number | null>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(h => {
        const val = row[h] ?? ''
        const str = String(val)
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str
      }).join(',')
    ),
  ]
  return lines.join('\n')
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const start = searchParams.get('start')
  const end = searchParams.get('end')
  const year = searchParams.get('year') || ''

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

  const incomeRows = (invoices || []).map((inv: any) => ({
    'Invoice Number': inv.invoice_number,
    'Date': inv.issue_date,
    'Child': inv.children ? `${inv.children.first_name} ${inv.children.last_name}` : '',
    'Parent': inv.children?.parent_name || '',
    'Amount (£)': Number(inv.total).toFixed(2),
    'Payment Method': inv.payment_method || '',
  }))

  const expenseRows = (expenses || []).map((exp: any) => ({
    'Date': exp.date,
    'Description': exp.description,
    'Category': exp.category,
    'Amount (£)': Number(exp.amount).toFixed(2),
    'Notes': exp.notes || '',
  }))

  const taxLabel = year ? `${year}-${String(Number(year) + 1).slice(2)}` : 'export'

  const incomeTotal = incomeRows.reduce((s, r) => s + Number(r['Amount (£)']), 0)
  const expenseTotal = expenseRows.reduce((s, r) => s + Number(r['Amount (£)']), 0)

  const parts: string[] = [
    `CHILDMINDER TAX SUMMARY - Tax Year ${taxLabel}`,
    `Generated: ${new Date().toLocaleDateString('en-GB')}`,
    '',
    '=== INCOME (Paid Invoices) ===',
    toCSV(incomeRows),
    `Total Income,,,${incomeTotal.toFixed(2)}`,
    '',
    '=== EXPENSES ===',
    toCSV(expenseRows),
    `Total Expenses,,,,${expenseTotal.toFixed(2)}`,
    '',
    `NET PROFIT,,,,${(incomeTotal - expenseTotal).toFixed(2)}`,
  ]

  const csv = parts.join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="tax-summary-${taxLabel}.csv"`,
    },
  })
}
