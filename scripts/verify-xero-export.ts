/**
 * Quick sanity check for Xero CSV builders (run: npx tsx scripts/verify-xero-export.ts)
 */
import {
  buildXeroInvoiceRows,
  buildXeroExpenseRows,
  buildAccountantSummaryCsv,
  invoiceInPeriod,
  mergeXeroSettings,
  rowsToCsv,
  toXeroDate,
  XERO_INVOICE_HEADERS,
} from '../src/lib/xero-export'
import type { Expense } from '../src/lib/types'

const settings = mergeXeroSettings(null)

const invoices = [
  {
    id: '1',
    invoice_number: 'INV-001',
    status: 'paid',
    issue_date: '2025-04-10',
    due_date: '2025-04-17',
    paid_at: '2025-05-01T12:00:00Z',
    total: 80,
    payment_method: 'bank_transfer',
    children: {
      first_name: 'Amy',
      last_name: 'Smith',
      parent_name: 'Sam Smith',
      parent_email: 'sam@example.com',
    },
    invoice_line_items: [
      { description: 'Full day', quantity: 1, unit_price: 50, amount: 50, is_funded: false },
      { description: 'Funded hours', quantity: 1, unit_price: 0, amount: 0, is_funded: true },
      { description: 'Private hours', quantity: 2, unit_price: 15, amount: 30, is_funded: false },
    ],
  },
]

const expenses: Expense[] = [
  {
    id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    childminder_id: 'u1',
    date: '2025-06-01',
    description: 'Nappies',
    category: 'Nappies & Consumables',
    amount: 12.5,
    notes: null,
    receipt_url: null,
    merchant_name: 'Tesco',
    ai_extracted: false,
    created_at: '',
    updated_at: '',
  },
]

console.assert(toXeroDate('2025-04-10') === '10/04/2025', 'UK date format')
console.assert(invoiceInPeriod(invoices[0], '2025-04-06', '2026-04-05', 'cash') === true, 'cash in period by paid_at')
console.assert(invoiceInPeriod(invoices[0], '2025-04-06', '2025-04-30', 'cash') === false, 'cash out of period')
console.assert(invoiceInPeriod(invoices[0], '2025-04-06', '2025-04-30', 'accrual') === true, 'accrual by issue')

const invRows = buildXeroInvoiceRows(invoices, settings, 'cash')
console.assert(invRows.length === 2, `expected 2 billable lines, got ${invRows.length}`)
console.assert(invRows[0].ContactName === 'Sam Smith')
console.assert(invRows[0].InvoiceDate === '01/05/2025', `cash date ${invRows[0].InvoiceDate}`)
console.assert(invRows[0].AccountCode === '200')
console.assert(invRows[0].TaxType === 'No VAT')

const expRows = buildXeroExpenseRows(expenses, settings)
console.assert(expRows.length === 1)
console.assert(expRows[0].ContactName === 'Tesco')
console.assert(expRows[0].AccountCode === '310')

const csv = rowsToCsv(XERO_INVOICE_HEADERS, invRows)
console.assert(csv.startsWith('ContactName,EmailAddress,'), 'header order')
console.assert(XERO_INVOICE_HEADERS.every(h => csv.split('\n')[0].includes(h)), 'all headers')

const summary = buildAccountantSummaryCsv({
  yearLabel: '2025-26',
  basis: 'cash',
  invoices,
  expenses,
})
console.assert(summary.includes('Cash basis'), 'summary basis label')

console.log('All xero-export checks passed')
console.log('--- sample invoice CSV ---')
console.log(csv)
