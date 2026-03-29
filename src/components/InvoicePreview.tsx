import type { Invoice, Profile, BankAccount } from '@/lib/types'
import { format } from 'date-fns'

function formatGBP(amount: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)
}

type Props = {
  invoice: Invoice
  profile: Profile
  primaryBankAccount?: BankAccount | null
}

export default function InvoicePreview({ invoice, profile, primaryBankAccount }: Props) {
  const child = (invoice as any).children
  const items = invoice.invoice_line_items || []

  // Resolve which bank account to show:
  // 1. Child-specific override (legacy per-child bank)
  // 2. Primary bank account from the new bank_accounts table
  // 3. Nothing (no payment details shown)
  const childBank = child?.bank_account_number
    ? { bank_name: child.bank_name, account_name: child.bank_account_name, sort_code: child.bank_sort_code, account_number: child.bank_account_number }
    : null
  const bankToShow = childBank ?? primaryBankAccount ?? null

  return (
    <div className="invoice-print-content bg-white font-sans text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>

      {/* Top accent bar */}
      <div style={{ height: '6px', background: '#059669', marginBottom: '40px' }} />

      {/* Header: INVOICE + childminder details */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px', padding: '0 40px' }}>
        <div>
          <div style={{ fontSize: '32px', fontWeight: '800', letterSpacing: '4px', color: '#111827', fontFamily: 'Arial, sans-serif' }}>INVOICE</div>
          <div style={{ fontSize: '16px', color: '#059669', fontWeight: '600', marginTop: '4px', fontFamily: 'Arial, sans-serif' }}>{invoice.invoice_number}</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '13px', color: '#4B5563', lineHeight: '1.7', fontFamily: 'Arial, sans-serif' }}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#111827', marginBottom: '2px' }}>{profile.full_name}</div>
          {profile.address_line1 && <div>{profile.address_line1}</div>}
          {profile.address_line2 && <div>{profile.address_line2}</div>}
          {(profile.city || profile.postcode) && <div>{[profile.city, profile.postcode].filter(Boolean).join(', ')}</div>}
          {profile.phone && <div>{profile.phone}</div>}
          {profile.email && <div style={{ color: '#059669' }}>{profile.email}</div>}
          {profile.show_ofsted_on_invoice && profile.ofsted_number && (
            <div style={{ marginTop: '6px', fontSize: '11px', color: '#9CA3AF' }}>
              Ofsted Reg: <span style={{ fontWeight: '600', color: '#6B7280' }}>{profile.ofsted_number}</span>
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid #E5E7EB', margin: '0 40px 32px' }} />

      {/* Bill To + Invoice Details */}
      <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0 40px 40px', gap: '40px', fontFamily: 'Arial, sans-serif' }}>
        {/* Bill To */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '2px', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '10px' }}>Bill To</div>
          {child ? (
            <>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>{child.parent_name}</div>
              <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '2px' }}>{child.parent_email}</div>
              {child.parent_phone && <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '6px' }}>{child.parent_phone}</div>}
              <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '6px' }}>
                Re: {child.first_name} {child.last_name}
              </div>
            </>
          ) : (
            <div style={{ fontSize: '13px', color: '#6B7280' }}>—</div>
          )}
        </div>

        {/* Invoice details */}
        <div style={{ minWidth: '180px' }}>
          <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '2px', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '10px' }}>Details</div>
          <table style={{ fontSize: '13px', borderCollapse: 'collapse', width: '100%' }}>
            <tbody>
              <tr>
                <td style={{ color: '#9CA3AF', paddingBottom: '6px', paddingRight: '16px' }}>Invoice date</td>
                <td style={{ fontWeight: '600', paddingBottom: '6px', textAlign: 'right' }}>{format(new Date(invoice.issue_date), 'd MMM yyyy')}</td>
              </tr>
              {invoice.due_date && (
                <tr>
                  <td style={{ color: '#9CA3AF', paddingBottom: '6px', paddingRight: '16px' }}>Due date</td>
                  <td style={{ fontWeight: '600', paddingBottom: '6px', textAlign: 'right', color: '#D97706' }}>{format(new Date(invoice.due_date), 'd MMM yyyy')}</td>
                </tr>
              )}
              <tr>
                <td style={{ color: '#9CA3AF', paddingRight: '16px' }}>Reference</td>
                <td style={{ fontWeight: '600', textAlign: 'right' }}>{invoice.invoice_number}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Line items table */}
      <div style={{ margin: '0 40px 40px', fontFamily: 'Arial, sans-serif' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#111827', color: 'white' }}>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: '600', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' }}>Description</th>
              <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: '600', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', width: '60px' }}>Days</th>
              <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: '600', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', width: '80px' }}>Rate</th>
              <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: '600', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', width: '90px' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const funded = !!(item as any).is_funded
              return (
                <tr key={item.id} style={{ background: funded ? '#F0FDF4' : (idx % 2 === 0 ? '#ffffff' : '#F9FAFB'), borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '12px 16px', color: '#374151' }}>
                    {item.description}
                    {funded && <span style={{ marginLeft: '8px', fontSize: '10px', fontWeight: '700', color: '#059669', background: '#DCFCE7', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Funded</span>}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', color: funded ? '#059669' : '#6B7280' }}>
                    {funded ? `${item.quantity} hrs` : item.quantity}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: funded ? '#059669' : '#6B7280' }}>
                    {funded ? 'FREE' : formatGBP(Number(item.unit_price))}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', color: funded ? '#059669' : '#111827' }}>
                    {funded ? '£0.00' : formatGBP(Number(item.amount))}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Funded hours notice */}
        {items.some(i => (i as any).is_funded) && (
          <div style={{ margin: '12px 0', padding: '10px 16px', background: '#F0FDF4', borderLeft: '3px solid #059669', borderRadius: '4px', fontSize: '11px', color: '#065F46', fontFamily: 'Arial, sans-serif' }}>
            Government-funded hours shown as FREE per DfE guidance. Total reflects private hours only.
          </div>
        )}

        {/* Total */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <div style={{ background: '#059669', color: 'white', padding: '12px 24px', borderRadius: '8px', display: 'flex', gap: '32px', alignItems: 'center', minWidth: '200px', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: '600', fontSize: '14px', fontFamily: 'Arial, sans-serif' }}>Total</span>
            <span style={{ fontWeight: '800', fontSize: '20px', fontFamily: 'Arial, sans-serif' }}>{formatGBP(Number(invoice.total))}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div style={{ margin: '0 40px 32px', padding: '14px 16px', background: '#FFFBEB', borderLeft: '3px solid #F59E0B', borderRadius: '4px', fontFamily: 'Arial, sans-serif' }}>
          <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '2px', color: '#D97706', textTransform: 'uppercase', marginBottom: '6px' }}>Notes</div>
          <div style={{ fontSize: '13px', color: '#374151' }}>{invoice.notes}</div>
        </div>
      )}

      {/* Payment details */}
      {bankToShow && (bankToShow.account_number || bankToShow.sort_code) && (
        <div style={{ margin: '0 40px 32px', padding: '18px 20px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', fontFamily: 'Arial, sans-serif' }}>
          <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '2px', color: '#059669', textTransform: 'uppercase', marginBottom: '12px' }}>Payment details</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 32px', fontSize: '13px' }}>
            {bankToShow.bank_name && (
              <div><span style={{ color: '#9CA3AF' }}>Bank  </span><span style={{ fontWeight: '600' }}>{bankToShow.bank_name}</span></div>
            )}
            {bankToShow.account_name && (
              <div><span style={{ color: '#9CA3AF' }}>Account name  </span><span style={{ fontWeight: '600' }}>{bankToShow.account_name}</span></div>
            )}
            {bankToShow.sort_code && (
              <div><span style={{ color: '#9CA3AF' }}>Sort code  </span><span style={{ fontWeight: '600' }}>{bankToShow.sort_code}</span></div>
            )}
            {bankToShow.account_number && (
              <div><span style={{ color: '#9CA3AF' }}>Account number  </span><span style={{ fontWeight: '600' }}>{bankToShow.account_number}</span></div>
            )}
          </div>
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#6B7280' }}>
            Please use reference: <strong>{invoice.invoice_number}</strong>
          </div>
        </div>
      )}

      {/* Stripe pay online */}
      {invoice.stripe_payment_link && (
        <div style={{ margin: '0 40px 32px', padding: '14px 16px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', fontFamily: 'Arial, sans-serif' }}>
          <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '2px', color: '#2563EB', textTransform: 'uppercase', marginBottom: '6px' }}>Pay online</div>
          <div style={{ fontSize: '13px', color: '#1D4ED8', wordBreak: 'break-all' }}>{invoice.stripe_payment_link}</div>
        </div>
      )}

      {/* Footer */}
      <div style={{ borderTop: '1px solid #E5E7EB', margin: '0 40px', paddingTop: '16px', paddingBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ fontSize: '11px', color: '#9CA3AF' }}>Thank you for your business</div>
        {invoice.status === 'paid' && (
          <div style={{ border: '3px solid #059669', borderRadius: '6px', padding: '4px 14px', transform: 'rotate(-4deg)', opacity: 0.6 }}>
            <span style={{ color: '#059669', fontSize: '18px', fontWeight: '900', letterSpacing: '4px' }}>PAID</span>
          </div>
        )}
        <div style={{ fontSize: '11px', color: '#9CA3AF' }}>{invoice.invoice_number}</div>
      </div>

      {/* Bottom accent bar */}
      <div style={{ height: '4px', background: '#059669' }} />
    </div>
  )
}
