import type { Invoice, Profile } from '@/lib/types'
import { format } from 'date-fns'

function formatGBP(amount: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)
}

type Props = {
  invoice: Invoice
  profile: Profile
}

export default function InvoicePreview({ invoice, profile }: Props) {
  const child = (invoice as any).children
  const items = invoice.invoice_line_items || []

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm print:shadow-none print:rounded-none print:p-8 font-sans">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">INVOICE</h1>
          <p className="text-emerald-600 font-semibold text-lg mt-1">{invoice.invoice_number}</p>
        </div>
        <div className="text-right text-sm text-gray-600">
          <p className="font-bold text-gray-900 text-base">{profile.full_name}</p>
          {profile.address_line1 && <p>{profile.address_line1}</p>}
          {profile.address_line2 && <p>{profile.address_line2}</p>}
          {(profile.city || profile.postcode) && (
            <p>{[profile.city, profile.postcode].filter(Boolean).join(', ')}</p>
          )}
          {profile.phone && <p>{profile.phone}</p>}
          {profile.email && <p>{profile.email}</p>}
        </div>
      </div>

      {/* Invoice meta */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Bill to</p>
          {child && (
            <>
              <p className="font-semibold text-gray-900">{child.parent_name}</p>
              <p className="text-gray-600 text-sm">{child.parent_email}</p>
              {child.parent_phone && <p className="text-gray-600 text-sm">{child.parent_phone}</p>}
              <p className="text-gray-500 text-sm mt-1">
                Child: <span className="font-medium text-gray-700">{child.first_name} {child.last_name}</span>
              </p>
            </>
          )}
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Invoice date</span>
              <span className="font-medium">{format(new Date(invoice.issue_date), 'd MMM yyyy')}</span>
            </div>
            {invoice.due_date && (
              <div className="flex justify-between">
                <span className="text-gray-500">Due date</span>
                <span className="font-medium text-amber-700">{format(new Date(invoice.due_date), 'd MMM yyyy')}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span className={`font-semibold capitalize ${
                invoice.status === 'paid' ? 'text-emerald-600' :
                invoice.status === 'overdue' ? 'text-red-600' :
                invoice.status === 'sent' ? 'text-amber-600' : 'text-gray-600'
              }`}>{invoice.status}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="mb-6">
        <div className="bg-gray-800 text-white rounded-t-lg grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium uppercase tracking-wide">
          <div className="col-span-6">Description</div>
          <div className="col-span-2 text-center">Days</div>
          <div className="col-span-2 text-right">Rate</div>
          <div className="col-span-2 text-right">Amount</div>
        </div>
        {items.map((item, idx) => (
          <div
            key={item.id}
            className={`grid grid-cols-12 gap-2 px-4 py-3 text-sm border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
          >
            <div className="col-span-6 text-gray-800">{item.description}</div>
            <div className="col-span-2 text-center text-gray-600">{item.quantity}</div>
            <div className="col-span-2 text-right text-gray-600">{formatGBP(Number(item.unit_price))}</div>
            <div className="col-span-2 text-right font-medium text-gray-900">{formatGBP(Number(item.amount))}</div>
          </div>
        ))}
        <div className="flex justify-end mt-2">
          <div className="bg-emerald-600 text-white rounded-lg px-6 py-3 min-w-40">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total</span>
              <span className="text-xl font-bold">{formatGBP(Number(invoice.total))}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-100">
          <p className="text-xs text-amber-700 font-medium uppercase mb-1">Notes</p>
          <p className="text-sm text-gray-700">{invoice.notes}</p>
        </div>
      )}

      {/* Payment details */}
      {child && (child.bank_account_number || child.bank_sort_code) && (
        <div className="border border-emerald-200 rounded-lg p-4 bg-emerald-50">
          <p className="text-xs text-emerald-700 font-medium uppercase tracking-wide mb-2">Payment details</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            {child.bank_name && (
              <div>
                <span className="text-gray-500">Bank: </span>
                <span className="font-medium">{child.bank_name}</span>
              </div>
            )}
            {child.bank_account_name && (
              <div>
                <span className="text-gray-500">Account name: </span>
                <span className="font-medium">{child.bank_account_name}</span>
              </div>
            )}
            {child.bank_sort_code && (
              <div>
                <span className="text-gray-500">Sort code: </span>
                <span className="font-medium">{child.bank_sort_code}</span>
              </div>
            )}
            {child.bank_account_number && (
              <div>
                <span className="text-gray-500">Account number: </span>
                <span className="font-medium">{child.bank_account_number}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">Reference: {invoice.invoice_number}</p>
        </div>
      )}

      {/* Stripe payment link */}
      {invoice.stripe_payment_link && (
        <div className="mt-4 border border-blue-200 rounded-lg p-4 bg-blue-50">
          <p className="text-xs text-blue-700 font-medium uppercase tracking-wide mb-1">Pay online</p>
          <p className="text-sm text-gray-600">Pay securely by card or Apple Pay:</p>
          <p className="text-sm text-blue-600 font-medium break-all">{invoice.stripe_payment_link}</p>
        </div>
      )}

      {/* Paid stamp */}
      {invoice.status === 'paid' && (
        <div className="mt-6 flex justify-center">
          <div className="border-4 border-emerald-500 rounded-xl px-8 py-3 rotate-[-8deg] opacity-70">
            <p className="text-emerald-600 text-3xl font-black tracking-widest">PAID</p>
          </div>
        </div>
      )}
    </div>
  )
}
