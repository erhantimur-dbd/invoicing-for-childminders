import { createServiceClient } from '@/lib/supabase/service'
import {
  expenseAccountCode,
  invoiceAccountingDate,
  invoiceInPeriod,
  mergeXeroSettings,
  type AccountingBasis,
  type InvoiceForExport,
  type XeroExportSettings,
} from '@/lib/xero-export'
import type { Expense } from '@/lib/types'
import {
  getValidAccessToken,
  toXeroApiDate,
  toXeroApiTaxType,
  xeroApi,
} from '@/lib/xero/client'

type SyncResult = {
  invoicesSynced: number
  invoicesSkipped: number
  expensesSynced: number
  expensesSkipped: number
  errors: string[]
}

type ChildRow = {
  id: string
  first_name: string | null
  last_name: string | null
  parent_name: string | null
  parent_email: string | null
  xero_contact_id: string | null
}

type InvoiceRow = InvoiceForExport & {
  child_id: string | null
  xero_invoice_id: string | null
  children: ChildRow | null
}

type ExpenseRow = Expense & { xero_bill_id: string | null }

type XeroContactResponse = {
  Contacts?: Array<{ ContactID: string; Name?: string }>
}

type XeroInvoiceResponse = {
  Invoices?: Array<{
    InvoiceID: string
    InvoiceNumber?: string
    StatusAttributeString?: string
    ValidationErrors?: Array<{ Message?: string }>
  }>
}

async function upsertContact(
  accessToken: string,
  tenantId: string,
  child: ChildRow
): Promise<string> {
  if (child.xero_contact_id) return child.xero_contact_id

  const name = (child.parent_name || `${child.first_name || ''} ${child.last_name || ''}`.trim() || 'Parent').trim()
  const payload = {
    Contacts: [
      {
        Name: name,
        EmailAddress: child.parent_email || undefined,
        ContactNumber: child.id.slice(0, 50),
      },
    ],
  }

  const data = await xeroApi<XeroContactResponse>(
    accessToken,
    tenantId,
    '/Contacts?summarizeErrors=false',
    {
      method: 'POST',
      body: JSON.stringify(payload),
      idempotencyKey: `contact-${child.id}`,
    }
  )

  const contactId = data.Contacts?.[0]?.ContactID
  if (!contactId) throw new Error(`Failed to create Xero contact for ${name}`)

  const service = createServiceClient()
  await service.from('children').update({ xero_contact_id: contactId }).eq('id', child.id)
  return contactId
}

function buildInvoicePayload(
  inv: InvoiceRow,
  contactId: string,
  settings: XeroExportSettings,
  basis: AccountingBasis
) {
  const accountingDate = invoiceAccountingDate(inv, basis)
  const childName = inv.children
    ? `${inv.children.first_name || ''} ${inv.children.last_name || ''}`.trim()
    : ''

  const billable = (inv.invoice_line_items || []).filter(
    li => !li.is_funded && Number(li.amount) > 0
  )
  const lines =
    billable.length > 0
      ? billable
      : Number(inv.total) > 0
        ? [
            {
              description: childName ? `Childminding — ${childName}` : 'Childminding fees',
              quantity: 1,
              unit_price: Number(inv.total),
              amount: Number(inv.total),
              is_funded: false,
            },
          ]
        : []

  if (lines.length === 0) return null

  const taxType = toXeroApiTaxType(settings.taxType)

  return {
    Type: 'ACCREC',
    Contact: { ContactID: contactId },
    InvoiceNumber: inv.invoice_number,
    Reference: childName || inv.payment_reference || undefined,
    Date: toXeroApiDate(accountingDate),
    DueDate: toXeroApiDate(inv.due_date || accountingDate),
    LineAmountTypes: taxType === 'NONE' ? 'NoTax' : 'Exclusive',
    CurrencyCode: 'GBP',
    Status: 'DRAFT',
    LineItems: lines.map(li => ({
      Description: li.description || 'Childminding',
      Quantity: Number(li.quantity) || 1,
      UnitAmount: Number(li.unit_price),
      AccountCode: settings.salesAccountCode,
      TaxType: taxType,
    })),
  }
}

function buildExpensePayload(exp: ExpenseRow, settings: XeroExportSettings) {
  const taxType = toXeroApiTaxType(settings.taxType)
  const date = toXeroApiDate(exp.date)
  const contactName = (exp.merchant_name || 'Childminding expense').trim() || 'Childminding expense'

  return {
    Type: 'ACCPAY',
    Contact: { Name: contactName },
    InvoiceNumber: `EXP-${exp.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`,
    Reference: exp.category,
    Date: date,
    DueDate: date,
    LineAmountTypes: taxType === 'NONE' ? 'NoTax' : 'Exclusive',
    CurrencyCode: 'GBP',
    Status: 'DRAFT',
    LineItems: [
      {
        Description: exp.description || exp.category,
        Quantity: 1,
        UnitAmount: Number(exp.amount),
        AccountCode: expenseAccountCode(exp.category, settings),
        TaxType: taxType,
      },
    ],
  }
}

export async function syncToXero(opts: {
  userId: string
  start: string
  end: string
  basis: AccountingBasis
}): Promise<SyncResult> {
  const { userId, start, end, basis } = opts
  const { accessToken, tenantId } = await getValidAccessToken(userId)
  const service = createServiceClient()

  const [{ data: profile }, { data: invoicesRaw }, { data: expensesRaw }] = await Promise.all([
    service
      .from('profiles')
      .select('xero_sales_account_code, xero_default_expense_account_code, xero_tax_type')
      .eq('id', userId)
      .maybeSingle(),
    service
      .from('invoices')
      .select(
        'id, child_id, invoice_number, status, issue_date, due_date, paid_at, total, payment_method, payment_reference, xero_invoice_id, children(id, first_name, last_name, parent_name, parent_email, xero_contact_id), invoice_line_items(description, quantity, unit_price, amount, is_funded)'
      )
      .eq('childminder_id', userId)
      .neq('status', 'draft')
      .order('issue_date'),
    service
      .from('expenses')
      .select('*')
      .eq('childminder_id', userId)
      .gte('date', start)
      .lte('date', end)
      .order('date'),
  ])

  const settings = mergeXeroSettings({
    salesAccountCode: profile?.xero_sales_account_code || undefined,
    defaultExpenseAccountCode: profile?.xero_default_expense_account_code || undefined,
    taxType: profile?.xero_tax_type || undefined,
  })

  const invoices = ((invoicesRaw || []) as unknown as Array<
    Omit<InvoiceRow, 'children'> & { children: ChildRow | ChildRow[] | null }
  >)
    .map(inv => ({
      ...inv,
      children: Array.isArray(inv.children) ? inv.children[0] || null : inv.children,
    }))
    .filter(inv => invoiceInPeriod(inv, start, end, basis))
  const expenses = (expensesRaw || []) as ExpenseRow[]

  const result: SyncResult = {
    invoicesSynced: 0,
    invoicesSkipped: 0,
    expensesSynced: 0,
    expensesSkipped: 0,
    errors: [],
  }

  // ── Invoices ────────────────────────────────────────────────
  for (const inv of invoices) {
    if (inv.xero_invoice_id) {
      result.invoicesSkipped++
      continue
    }
    try {
      if (!inv.children) {
        result.errors.push(`${inv.invoice_number}: missing child/parent contact`)
        continue
      }
      const contactId = await upsertContact(accessToken, tenantId, inv.children)
      const payload = buildInvoicePayload(inv, contactId, settings, basis)
      if (!payload) {
        result.invoicesSkipped++
        continue
      }

      const data = await xeroApi<XeroInvoiceResponse>(
        accessToken,
        tenantId,
        '/Invoices?summarizeErrors=false',
        {
          method: 'POST',
          body: JSON.stringify({ Invoices: [payload] }),
          idempotencyKey: `inv-${inv.id}`,
        }
      )

      const created = data.Invoices?.[0]
      if (created?.ValidationErrors?.length) {
        result.errors.push(
          `${inv.invoice_number}: ${created.ValidationErrors.map(e => e.Message).join('; ')}`
        )
        continue
      }
      if (!created?.InvoiceID) {
        result.errors.push(`${inv.invoice_number}: no InvoiceID returned`)
        continue
      }

      await service.from('invoices').update({ xero_invoice_id: created.InvoiceID }).eq('id', inv.id)
      result.invoicesSynced++
    } catch (err) {
      result.errors.push(
        `${inv.invoice_number}: ${err instanceof Error ? err.message : 'sync failed'}`
      )
    }
  }

  // ── Expenses ────────────────────────────────────────────────
  for (const exp of expenses) {
    if (exp.xero_bill_id) {
      result.expensesSkipped++
      continue
    }
    try {
      const payload = buildExpensePayload(exp, settings)
      const data = await xeroApi<XeroInvoiceResponse>(
        accessToken,
        tenantId,
        '/Invoices?summarizeErrors=false',
        {
          method: 'POST',
          body: JSON.stringify({ Invoices: [payload] }),
          idempotencyKey: `exp-${exp.id}`,
        }
      )

      const created = data.Invoices?.[0]
      if (created?.ValidationErrors?.length) {
        result.errors.push(
          `Expense ${exp.date}: ${created.ValidationErrors.map(e => e.Message).join('; ')}`
        )
        continue
      }
      if (!created?.InvoiceID) {
        result.errors.push(`Expense ${exp.date}: no InvoiceID returned`)
        continue
      }

      await service.from('expenses').update({ xero_bill_id: created.InvoiceID }).eq('id', exp.id)
      result.expensesSynced++
    } catch (err) {
      result.errors.push(
        `Expense ${exp.date}: ${err instanceof Error ? err.message : 'sync failed'}`
      )
    }
  }

  return result
}
