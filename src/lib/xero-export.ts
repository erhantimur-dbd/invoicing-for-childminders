import type { Expense } from '@/lib/types'
import { EXPENSE_CATEGORIES } from '@/lib/types'

export type AccountingBasis = 'cash' | 'accrual'

export type XeroExportSettings = {
  salesAccountCode: string
  defaultExpenseAccountCode: string
  taxType: string
  /** Optional per-category overrides; keys are EXPENSE_CATEGORIES values */
  expenseAccountMap: Partial<Record<(typeof EXPENSE_CATEGORIES)[number], string>>
}

/** Sensible UK Xero sole-trader defaults — users must match their own chart of accounts. */
export const DEFAULT_XERO_SETTINGS: XeroExportSettings = {
  salesAccountCode: '200',
  defaultExpenseAccountCode: '429',
  taxType: 'No VAT',
  expenseAccountMap: {
    'Food & Drink': '310',
    'Outings & Trips': '429',
    "Children's Groups & Classes": '429',
    'Arts, Crafts & Activities': '429',
    'Books & Educational Materials': '429',
    'Toys & Play Equipment': '429',
    'Nappies & Consumables': '310',
    'Travel & Transport': '461',
    'Home & Premises': '485',
    'Clothing & Uniforms': '429',
    'Insurance & Professional Fees': '445',
    'First Aid & Medical': '429',
    'Office & Admin': '453',
    Other: '429',
  },
}

export const XERO_SETTINGS_STORAGE_KEY = 'dottie-xero-export-settings'

/** Full Xero UK sales-invoice / bills import template headings (do not rename or drop). */
export const XERO_INVOICE_HEADERS = [
  'ContactName',
  'EmailAddress',
  'POAddressLine1',
  'POAddressLine2',
  'POAddressLine3',
  'POAddressLine4',
  'POCity',
  'PORegion',
  'POPostalCode',
  'POCountry',
  'InvoiceNumber',
  'Reference',
  'InvoiceDate',
  'DueDate',
  'InventoryItemCode',
  'Description',
  'Quantity',
  'UnitAmount',
  'Discount',
  'AccountCode',
  'TaxType',
  'TrackingName1',
  'TrackingOption1',
  'TrackingName2',
  'TrackingOption2',
  'Currency',
  'BrandingTheme',
] as const

export type XeroInvoiceRow = Record<(typeof XERO_INVOICE_HEADERS)[number], string>

export type InvoiceForExport = {
  id: string
  invoice_number: string
  status: string
  issue_date: string
  due_date: string | null
  paid_at: string | null
  total: number
  payment_method?: string | null
  payment_reference?: string | null
  children?: {
    first_name?: string | null
    last_name?: string | null
    parent_name?: string | null
    parent_email?: string | null
  } | null
  invoice_line_items?: Array<{
    description: string
    quantity: number
    unit_price: number
    amount: number
    is_funded: boolean
  }> | null
}

export function mergeXeroSettings(
  overrides?: Partial<XeroExportSettings> | null
): XeroExportSettings {
  if (!overrides) return { ...DEFAULT_XERO_SETTINGS, expenseAccountMap: { ...DEFAULT_XERO_SETTINGS.expenseAccountMap } }
  return {
    salesAccountCode: overrides.salesAccountCode?.trim() || DEFAULT_XERO_SETTINGS.salesAccountCode,
    defaultExpenseAccountCode:
      overrides.defaultExpenseAccountCode?.trim() || DEFAULT_XERO_SETTINGS.defaultExpenseAccountCode,
    taxType: overrides.taxType?.trim() || DEFAULT_XERO_SETTINGS.taxType,
    expenseAccountMap: {
      ...DEFAULT_XERO_SETTINGS.expenseAccountMap,
      ...(overrides.expenseAccountMap || {}),
    },
  }
}

export function loadXeroSettingsFromStorage(): Partial<XeroExportSettings> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(XERO_SETTINGS_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Partial<XeroExportSettings>
  } catch {
    return null
  }
}

export function saveXeroSettingsToStorage(settings: Partial<XeroExportSettings>) {
  if (typeof window === 'undefined') return
  localStorage.setItem(XERO_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
}

/** Format a Date or ISO/date string as UK DD/MM/YYYY for Xero imports. */
export function toXeroDate(value: string | Date | null | undefined): string {
  if (!value) return ''
  const d = typeof value === 'string' ? parseDateOnly(value) : value
  if (Number.isNaN(d.getTime())) return ''
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function parseDateOnly(value: string): Date {
  // paid_at may be full ISO; issue_date/expense date are usually YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [y, m, d] = value.slice(0, 10).split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  return new Date(value)
}

export function dateOnlyIso(value: string | null | undefined): string | null {
  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10)
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function invoiceInPeriod(
  inv: InvoiceForExport,
  start: string,
  end: string,
  basis: AccountingBasis
): boolean {
  if (basis === 'cash') {
    if (inv.status !== 'paid') return false
    const paid = dateOnlyIso(inv.paid_at)
    if (!paid) return false
    return paid >= start && paid <= end
  }
  // Accrual: issued in period; exclude drafts
  if (inv.status === 'draft') return false
  const issued = dateOnlyIso(inv.issue_date)
  if (!issued) return false
  return issued >= start && issued <= end
}

export function invoiceAccountingDate(inv: InvoiceForExport, basis: AccountingBasis): string {
  if (basis === 'cash') return dateOnlyIso(inv.paid_at) || dateOnlyIso(inv.issue_date) || ''
  return dateOnlyIso(inv.issue_date) || ''
}

function emptyXeroRow(): XeroInvoiceRow {
  return Object.fromEntries(XERO_INVOICE_HEADERS.map(h => [h, ''])) as XeroInvoiceRow
}

function csvEscape(val: string | number | null | undefined): string {
  const str = String(val ?? '')
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function rowsToCsv(headers: readonly string[], rows: Record<string, string>[]): string {
  const lines = [
    headers.join(','),
    ...rows.map(row => headers.map(h => csvEscape(row[h] ?? '')).join(',')),
  ]
  return lines.join('\n')
}

export function expenseAccountCode(
  category: string,
  settings: XeroExportSettings
): string {
  const mapped = settings.expenseAccountMap[category as (typeof EXPENSE_CATEGORIES)[number]]
  return mapped || settings.defaultExpenseAccountCode
}

/**
 * Build Xero sales-invoice CSV rows (one row per billable line item).
 * Funded (£0) lines are omitted — they are not revenue.
 */
export function buildXeroInvoiceRows(
  invoices: InvoiceForExport[],
  settings: XeroExportSettings,
  basis: AccountingBasis
): XeroInvoiceRow[] {
  const rows: XeroInvoiceRow[] = []

  for (const inv of invoices) {
    const child = inv.children
    const childName = child
      ? `${child.first_name || ''} ${child.last_name || ''}`.trim()
      : ''
    const contactName = (child?.parent_name || childName || 'Parent').trim() || 'Parent'
    const accountingDate = invoiceAccountingDate(inv, basis)
    const invoiceDate = toXeroDate(accountingDate)
    const dueDate = toXeroDate(inv.due_date || accountingDate)
    const reference = childName || inv.payment_reference || ''

    const billable = (inv.invoice_line_items || []).filter(
      li => !li.is_funded && Number(li.amount) > 0
    )

    // Fallback: no line items — one row with invoice total
    const lines =
      billable.length > 0
        ? billable
        : Number(inv.total) > 0
          ? [
              {
                description: childName
                  ? `Childminding — ${childName}`
                  : 'Childminding fees',
                quantity: 1,
                unit_price: Number(inv.total),
                amount: Number(inv.total),
                is_funded: false,
              },
            ]
          : []

    for (const li of lines) {
      const row = emptyXeroRow()
      row.ContactName = contactName
      row.EmailAddress = child?.parent_email || ''
      row.InvoiceNumber = inv.invoice_number
      row.Reference = reference
      row.InvoiceDate = invoiceDate
      row.DueDate = dueDate
      row.Description = li.description || 'Childminding'
      row.Quantity = String(Number(li.quantity) || 1)
      row.UnitAmount = Number(li.unit_price).toFixed(2)
      row.AccountCode = settings.salesAccountCode
      row.TaxType = settings.taxType
      row.Currency = 'GBP'
      rows.push(row)
    }
  }

  return rows
}

/** Build Xero bills CSV rows from expenses (one row per expense). */
export function buildXeroExpenseRows(
  expenses: Expense[],
  settings: XeroExportSettings
): XeroInvoiceRow[] {
  return expenses.map(exp => {
    const row = emptyXeroRow()
    const date = toXeroDate(exp.date)
    row.ContactName = (exp.merchant_name || 'Childminding expense').trim() || 'Childminding expense'
    row.InvoiceNumber = `EXP-${exp.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`
    row.Reference = exp.category
    row.InvoiceDate = date
    row.DueDate = date
    row.Description = exp.description || exp.category
    row.Quantity = '1'
    row.UnitAmount = Number(exp.amount).toFixed(2)
    row.AccountCode = expenseAccountCode(exp.category, settings)
    row.TaxType = settings.taxType
    row.Currency = 'GBP'
    return row
  })
}

export function buildAccountantSummaryCsv(opts: {
  yearLabel: string
  basis: AccountingBasis
  invoices: InvoiceForExport[]
  expenses: Expense[]
}): string {
  const { yearLabel, basis, invoices, expenses } = opts

  const incomeRows = invoices.map(inv => {
    const child = inv.children
    return {
      'Invoice Number': inv.invoice_number,
      Date: invoiceAccountingDate(inv, basis),
      Child: child ? `${child.first_name || ''} ${child.last_name || ''}`.trim() : '',
      Parent: child?.parent_name || '',
      'Amount (£)': Number(inv.total).toFixed(2),
      'Payment Method': inv.payment_method || '',
    }
  })

  const expenseRows = expenses.map(exp => ({
    Date: exp.date,
    Description: exp.description,
    Category: exp.category,
    'Amount (£)': Number(exp.amount).toFixed(2),
    Notes: exp.notes || '',
  }))

  const incomeTotal = incomeRows.reduce((s, r) => s + Number(r['Amount (£)']), 0)
  const expenseTotal = expenseRows.reduce((s, r) => s + Number(r['Amount (£)']), 0)
  const basisLabel = basis === 'cash' ? 'Cash basis (by payment date)' : 'Accrual (by invoice date)'

  const toCsv = (rows: Record<string, string>[]) => {
    if (rows.length === 0) return ''
    return rowsToCsv(Object.keys(rows[0]), rows)
  }

  return [
    `CHILDMINDER TAX SUMMARY - Tax Year ${yearLabel}`,
    `Basis: ${basisLabel}`,
    `Generated: ${new Date().toLocaleDateString('en-GB')}`,
    '',
    '=== INCOME ===',
    toCsv(incomeRows),
    `Total Income,,,${incomeTotal.toFixed(2)}`,
    '',
    '=== EXPENSES ===',
    toCsv(expenseRows),
    `Total Expenses,,,,${expenseTotal.toFixed(2)}`,
    '',
    `NET PROFIT,,,,${(incomeTotal - expenseTotal).toFixed(2)}`,
  ].join('\n')
}
