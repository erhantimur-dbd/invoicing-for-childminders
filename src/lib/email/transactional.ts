import { escapeHtml } from '@/lib/html-escape.mjs'
import { buttonGroup, filledButton, outlineButton, renderEmail, textLink } from '@/lib/email/layout'

const H = 'margin:0 0 12px;font-size:24px;font-weight:700;line-height:1.3;color:#0b1220;'
const P = 'margin:0 0 16px;font-size:15px;line-height:1.6;color:#0b1220;'
const MUTED = 'margin:0 0 16px;font-size:14px;line-height:1.6;color:#5b6573;'

export function formatGbp(amount: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)
}

export function invoiceSendEmail(input: {
  invoiceNumber: string
  total: number
  dueLabel: string | null
  parentName: string
  childFirstName: string
  childminderName: string
  childminderEmail: string
  childminderPhone: string
  items: Array<{ description: string; quantity: string | number; unitPrice: number; amount: number }>
  bank: { bankName: string; accountName: string; sortCode: string; accountNumber: string } | null
  viewUrl: string
  payUrl: string | null
  notes: string | null
}): { subject: string; html: string } {
  const who = escapeHtml(input.childminderName)
  const rows = input.items.map((item) => `
    <tr>
      <td class="ink" style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#0b1220;">${escapeHtml(item.description)}</td>
      <td class="ink" style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;color:#0b1220;">${escapeHtml(String(item.quantity))}</td>
      <td class="ink" style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#0b1220;">${formatGbp(Number(item.unitPrice))}</td>
      <td class="ink" style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;color:#0b1220;">${formatGbp(Number(item.amount))}</td>
    </tr>
  `).join('')

  const bank = input.bank
  const bankHtml = bank?.accountNumber
    ? `<table role="presentation" class="panel" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin:8px 0 0;">
        <tr><td style="padding:16px 20px;">
          <p class="ink" style="margin:0 0 8px;font-size:15px;font-weight:700;color:#0b1220;">Pay by bank transfer</p>
          ${bank.bankName ? `<p class="ink" style="margin:2px 0;font-size:14px;color:#0b1220;"><strong>Bank:</strong> ${escapeHtml(bank.bankName)}</p>` : ''}
          ${bank.accountName ? `<p class="ink" style="margin:2px 0;font-size:14px;color:#0b1220;"><strong>Account name:</strong> ${escapeHtml(bank.accountName)}</p>` : ''}
          ${bank.sortCode ? `<p class="ink" style="margin:2px 0;font-size:14px;color:#0b1220;"><strong>Sort code:</strong> ${escapeHtml(bank.sortCode)}</p>` : ''}
          <p class="ink" style="margin:2px 0;font-size:14px;color:#0b1220;"><strong>Account number:</strong> ${escapeHtml(bank.accountNumber)}</p>
          <p class="muted" style="margin:8px 0 0;font-size:14px;color:#5b6573;"><strong>Reference:</strong> ${escapeHtml(input.invoiceNumber)}</p>
        </td></tr>
      </table>`
    : `<p class="muted" style="${MUTED}">Pay by bank transfer using the details ${who} has given you.</p>`

  const buttons = input.payUrl
    ? buttonGroup([
        filledButton('Pay this invoice', input.payUrl),
        outlineButton('View invoice', input.viewUrl),
      ])
    : buttonGroup([outlineButton('View invoice', input.viewUrl)])

  const contactBits = [input.childminderName, input.childminderEmail, input.childminderPhone].filter(Boolean)

  const content = `
    <h1 class="ink" style="${H}">Invoice ${escapeHtml(input.invoiceNumber)}</h1>
    <p class="muted" style="${MUTED}">From ${who}</p>
    <p class="ink" style="${P}">Dear ${escapeHtml(input.parentName)},</p>
    <p class="ink" style="${P}">${who} has sent the invoice for ${escapeHtml(input.childFirstName)}'s childcare.</p>
    <table class="sheet" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:8px 0 16px;">
      <thead>
        <tr>
          <th class="ink" align="left" style="padding:10px 12px;text-align:left;background-color:#0b1220;color:#ffffff;font-size:13px;">Description</th>
          <th class="ink" align="center" style="padding:10px 12px;text-align:center;background-color:#0b1220;color:#ffffff;font-size:13px;">Days</th>
          <th class="ink" align="right" style="padding:10px 12px;text-align:right;background-color:#0b1220;color:#ffffff;font-size:13px;">Rate</th>
          <th class="ink" align="right" style="padding:10px 12px;text-align:right;background-color:#0b1220;color:#ffffff;font-size:13px;">Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="ink" style="margin:0 0 16px;font-size:18px;font-weight:700;color:#0b1220;text-align:right;">Total: ${formatGbp(Number(input.total))}</p>
    ${input.dueLabel ? `<p class="ink" style="${P}">Payment due by ${escapeHtml(input.dueLabel)}.</p>` : ''}
    ${bankHtml}
    ${buttons}
    ${input.payUrl ? `<p class="panel" style="margin:0 0 16px;padding:12px;background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;line-height:1.5;color:#0b1220;">Payments go straight to ${who}, not to Go Dottie.</p>` : ''}
    ${input.notes ? `<p class="panel" style="margin:0 0 16px;padding:12px;background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;line-height:1.5;color:#0b1220;">${escapeHtml(input.notes)}</p>` : ''}
    <p class="muted" style="margin:0;font-size:12px;line-height:1.5;color:#5b6573;text-align:center;">${contactBits.map((bit) => escapeHtml(bit)).join(' · ')}</p>
  `

  return {
    subject: `Invoice ${input.invoiceNumber} from ${input.childminderName} — ${formatGbp(Number(input.total))}`,
    html: renderEmail(content, 'parent'),
  }
}

export function contactInboxNoticeEmail(input: {
  name: string
  email: string
  subject: string
  message: string
  ip: string
}): { subject: string; html: string } {
  const subject = input.subject.trim() || '(no subject)'
  const content = `
    <h1 class="ink" style="${H}">New contact form submission</h1>
    <p class="muted" style="${MUTED}">Received via godottie.cloud/support</p>
    <table class="sheet" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td class="muted" style="padding:6px 0;color:#5b6573;width:80px;">Name</td><td class="ink" style="padding:6px 0;font-weight:600;color:#0b1220;">${escapeHtml(input.name.trim())}</td></tr>
      <tr><td class="muted" style="padding:6px 0;color:#5b6573;">Email</td><td style="padding:6px 0;">${textLink(`mailto:${input.email.trim()}`, input.email.trim())}</td></tr>
      <tr><td class="muted" style="padding:6px 0;color:#5b6573;">Subject</td><td class="ink" style="padding:6px 0;color:#0b1220;">${escapeHtml(subject)}</td></tr>
    </table>
    <p class="muted" style="margin:16px 0 6px;font-size:13px;color:#5b6573;">Message</p>
    <div class="panel" style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;font-size:14px;line-height:1.6;white-space:pre-wrap;color:#0b1220;">${escapeHtml(input.message.trim())}</div>
    <p class="muted" style="margin:16px 0 0;font-size:11px;color:#5b6573;">IP: ${escapeHtml(input.ip)}</p>
  `
  return {
    subject: `[Contact] ${subject}`,
    html: renderEmail(content, 'account'),
  }
}

export function contactAutoReplyEmail(input: { name: string }): { subject: string; html: string } {
  const first = escapeHtml(input.name.trim().split(' ')[0] || 'there')
  const content = `
    <h1 class="ink" style="${H}">Hi ${first}</h1>
    <p class="ink" style="${P}">Thanks for your message. You will get a reply within 24 hours on business days.</p>
  `
  return {
    subject: 'Got your message',
    html: renderEmail(content, 'parent', { footerLead: 'The Go Dottie team' }),
  }
}

export function weeklyDraftDigestEmail(input: {
  firstName: string
  weekLabel: string
  created: Array<{ child_name: string; total: number; agent_notes: string | null }>
  skipped: Array<{ child_name: string; reason: string }>
  invoicesUrl: string
}): { subject: string; html: string } {
  const count = input.created.length
  const totalAmount = input.created.reduce((sum, row) => sum + row.total, 0)
  const createdRows = input.created.map((row) => `
    <tr>
      <td class="ink" style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#0b1220;">${escapeHtml(row.child_name)}</td>
      <td class="ink" style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;color:#0b1220;">£${row.total.toFixed(2)}</td>
      <td class="muted" style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#5b6573;font-size:12px;">${row.agent_notes ? escapeHtml(row.agent_notes) : ''}</td>
    </tr>
  `).join('')
  const skipped = input.skipped.length
    ? `<p class="ink" style="margin:8px 0 8px;font-weight:700;color:#0b1220;">Skipped (${input.skipped.length})</p>
       <ul style="margin:0;padding-left:20px;">
         ${input.skipped.map((row) => `<li class="muted" style="color:#5b6573;">${escapeHtml(row.child_name)} — ${escapeHtml(row.reason)}</li>`).join('')}
       </ul>`
    : ''

  const content = `
    <h1 class="ink" style="${H}">Weekly invoices generated</h1>
    <p class="muted" style="${MUTED}">Hi ${escapeHtml(input.firstName)}, here is your summary for w/c ${escapeHtml(input.weekLabel)}.</p>
    <table class="sheet" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
      <thead>
        <tr>
          <th class="ink" align="left" style="padding:10px 12px;text-align:left;background-color:#0b1220;color:#ffffff;font-size:13px;">Child</th>
          <th class="ink" align="right" style="padding:10px 12px;text-align:right;background-color:#0b1220;color:#ffffff;font-size:13px;">Amount</th>
          <th class="ink" align="left" style="padding:10px 12px;text-align:left;background-color:#0b1220;color:#ffffff;font-size:13px;">Notes</th>
        </tr>
      </thead>
      <tbody>${createdRows}</tbody>
      <tfoot>
        <tr>
          <td class="ink" style="padding:10px 12px;font-weight:700;color:#0b1220;">Total</td>
          <td class="ink" style="padding:10px 12px;text-align:right;font-weight:700;color:#0b1220;">£${totalAmount.toFixed(2)}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>
    ${skipped}
    ${buttonGroup([filledButton('Review and send drafts', input.invoicesUrl)])}
    <p class="muted" style="margin:0;font-size:12px;line-height:1.5;color:#5b6573;text-align:center;">These invoices are saved as drafts. Review them before sending to parents.</p>
  `

  return {
    subject: `${count} draft invoice${count === 1 ? '' : 's'} generated — w/c ${input.weekLabel}`,
    html: renderEmail(content, 'account'),
  }
}
