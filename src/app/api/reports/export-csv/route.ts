import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Expense } from '@/lib/types'
import {
  type AccountingBasis,
  type InvoiceForExport,
  type XeroExportSettings,
  buildAccountantSummaryCsv,
  buildXeroExpenseRows,
  buildXeroInvoiceRows,
  invoiceInPeriod,
  mergeXeroSettings,
  rowsToCsv,
  XERO_INVOICE_HEADERS,
} from '@/lib/xero-export'

export type ExportFormat = 'summary' | 'xero-invoices' | 'xero-expenses'

function parseBasis(value: string | null): AccountingBasis {
  return value === 'accrual' ? 'accrual' : 'cash'
}

function parseFormat(value: string | null): ExportFormat {
  if (value === 'xero-invoices' || value === 'xero-expenses') return value
  return 'summary'
}

function parseSettings(
  searchParams: URLSearchParams,
  profile?: {
    xero_sales_account_code?: string | null
    xero_default_expense_account_code?: string | null
    xero_tax_type?: string | null
  } | null
): XeroExportSettings {
  let expenseAccountMap: XeroExportSettings['expenseAccountMap'] = {}
  const mapRaw = searchParams.get('expenseMap')
  if (mapRaw) {
    try {
      expenseAccountMap = JSON.parse(mapRaw)
    } catch {
      expenseAccountMap = {}
    }
  }

  // Query params override profile; profile overrides code defaults
  return mergeXeroSettings({
    salesAccountCode:
      searchParams.get('salesAccount') || profile?.xero_sales_account_code || undefined,
    defaultExpenseAccountCode:
      searchParams.get('expenseAccount') || profile?.xero_default_expense_account_code || undefined,
    taxType: searchParams.get('taxType') || profile?.xero_tax_type || undefined,
    expenseAccountMap,
  })
}

function csvResponse(body: string, filename: string) {
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const start = searchParams.get('start')
  const end = searchParams.get('end')
  const year = searchParams.get('year') || ''
  const basis = parseBasis(searchParams.get('basis'))
  const format = parseFormat(searchParams.get('format'))

  if (!start || !end) {
    return NextResponse.json({ error: 'Missing date range' }, { status: 400 })
  }

  const taxLabel = year ? `${year}-${String(Number(year) + 1).slice(2)}` : 'export'

  // Fetch profile settings + a wider invoice set, then filter for cash vs accrual dating
  const [{ data: profile }, { data: invoicesRaw }, { data: expensesRaw }] = await Promise.all([
    supabase
      .from('profiles')
      .select('xero_sales_account_code, xero_default_expense_account_code, xero_tax_type')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('invoices')
      .select(
        'id, invoice_number, status, issue_date, due_date, paid_at, total, payment_method, payment_reference, children(first_name, last_name, parent_name, parent_email), invoice_line_items(description, quantity, unit_price, amount, is_funded)'
      )
      .eq('childminder_id', user.id)
      .neq('status', 'draft')
      .order('issue_date'),
    supabase
      .from('expenses')
      .select('id, date, description, category, amount, notes, merchant_name, receipt_url, ai_extracted, childminder_id, created_at, updated_at')
      .eq('childminder_id', user.id)
      .gte('date', start)
      .lte('date', end)
      .order('date'),
  ])

  const settings = parseSettings(searchParams, profile)

  const invoices = ((invoicesRaw || []) as InvoiceForExport[]).filter(inv =>
    invoiceInPeriod(inv, start, end, basis)
  )
  const expenses = (expensesRaw || []) as Expense[]

  if (format === 'xero-invoices') {
    const rows = buildXeroInvoiceRows(invoices, settings, basis)
    const csv = rowsToCsv(XERO_INVOICE_HEADERS, rows)
    return csvResponse(csv, `xero-invoices-${taxLabel}-${basis}.csv`)
  }

  if (format === 'xero-expenses') {
    const rows = buildXeroExpenseRows(expenses, settings)
    const csv = rowsToCsv(XERO_INVOICE_HEADERS, rows)
    return csvResponse(csv, `xero-expenses-${taxLabel}.csv`)
  }

  const csv = buildAccountantSummaryCsv({
    yearLabel: taxLabel,
    basis,
    invoices,
    expenses,
  })
  return csvResponse(csv, `tax-summary-${taxLabel}-${basis}.csv`)
}
