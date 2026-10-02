import { buttonGroup, filledButton, outlineButton, renderEmail } from '@/lib/email/layout'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.godottie.cloud'

const H = 'margin:0 0 12px;font-size:24px;font-weight:700;line-height:1.3;color:#0b1220;'
const P = 'margin:0 0 16px;font-size:15px;line-height:1.6;color:#0b1220;'
const MUTED = 'margin:0 0 16px;font-size:14px;line-height:1.6;color:#5b6573;'
const SIGN = 'margin:20px 0 0;font-size:14px;line-height:1.6;color:#0b1220;'

function esc(str: string | null | undefined): string {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name
}

function accountSignoff(): string {
  return `<p class="ink" style="${SIGN}">Talk soon,<br><strong>Go Dottie</strong></p>`
}

// ─── Template 1: Welcome email ────────────────────────────────────────────────

export function welcomeEmail({ name }: { name: string }): {
  subject: string
  html: string
} {
  const rawFirst = name.split(' ')[0]
  const first = esc(rawFirst)

  const content = `
    <h1 class="ink" style="${H}">Welcome to Go Dottie, ${first}</h1>
    <p class="ink" style="${P}">Go Dottie, your enquiries assistant.</p>
    <p class="ink" style="${P}">
      Parent enquiries can land in your Gmail. Go Dottie helps you reply, offer a visit, and send a signup form when you are ready to offer a place.
    </p>
    <table role="presentation" class="panel" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin:8px 0 0;">
      <tr>
        <td style="padding:16px 20px;">
          <p class="ink" style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#0b1220;">What you can do</p>
          <ul style="margin:0;padding-left:18px;">
            <li class="ink" style="margin:0 0 6px;font-size:14px;line-height:1.5;color:#0b1220;">Answer parent enquiries from your Gmail, in your voice</li>
            <li class="ink" style="margin:0 0 6px;font-size:14px;line-height:1.5;color:#0b1220;">Offer visits in hours you set</li>
            <li class="ink" style="margin:0;font-size:14px;line-height:1.5;color:#0b1220;">Send a signup form when you offer a place</li>
          </ul>
        </td>
      </tr>
    </table>
    ${buttonGroup([filledButton('Connect your Gmail', `${APP_URL}/enquiries`)])}
    <p class="muted" style="${MUTED}">Any questions? Just reply to this email.</p>
    ${accountSignoff()}
  `

  return {
    subject: `Welcome to Go Dottie, ${rawFirst}`,
    html: renderEmail(content, 'account'),
  }
}

function planStartLabel(startDate?: string): string {
  const raw = startDate?.trim()
  const parsed = raw ? new Date(raw) : new Date()
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  }
  return raw || ''
}

export function subscriptionConfirmEmail({
  name,
  plan,
  startDate,
}: {
  name: string
  plan: string
  startDate?: string
}): { subject: string; html: string } {
  const rawFirst = name.split(' ')[0]
  const started = planStartLabel(startDate)
  void plan

  const content = `
    <h1 class="ink" style="${H}">Hi ${esc(rawFirst)}</h1>
    <p class="ink" style="${P}">You're on Go Dottie Enquiries, £160 a year.</p>
    <p class="ink" style="${P}">Your plan started on ${esc(started)}.</p>
    <p class="ink" style="${P}">You can manage or cancel any time in Settings.</p>
    ${buttonGroup([filledButton('Open Settings', `${APP_URL}/profile`)])}
    ${accountSignoff()}
  `

  return {
    subject: 'Your Go Dottie plan is confirmed',
    html: renderEmail(content, 'account'),
  }
}

// ─── Payment reminder (parent-facing) ─────────────────────────────────────────

export function paymentReminderEmail({
  parentName,
  childFirstName,
  invoiceNumber,
  total,
  dueDate,
  publicUrl,
  payUrl,
  overdue,
  childminderName,
}: {
  parentName: string
  childFirstName: string
  invoiceNumber: string
  total: number
  dueDate: string | null
  publicUrl: string
  payUrl?: string | null
  overdue: boolean
  childminderName: string
}): { subject: string; html: string } {
  const first = esc(parentName.split(' ')[0] || parentName)
  const amount = `£${total.toFixed(2)}`
  const dueLine = dueDate
    ? `was due on <strong>${esc(dueDate)}</strong>`
    : 'is awaiting payment'
  const who = esc(childminderName)
  const buttons = payUrl
    ? buttonGroup([
        filledButton('Pay now', payUrl),
        outlineButton('View invoice', publicUrl),
      ])
    : buttonGroup([outlineButton('View invoice', publicUrl)])

  const content = `
    <h1 class="ink" style="${H}">${overdue ? 'Payment overdue' : 'Payment reminder'}</h1>
    <p class="muted" style="${MUTED}">Invoice ${esc(invoiceNumber)} from ${who}</p>
    <p class="ink" style="${P}">
      Hi ${first}, this is a note from <strong>${who}</strong>.
      Invoice <strong>${esc(invoiceNumber)}</strong> for ${esc(childFirstName)}'s childcare ${dueLine}.
    </p>
    <table role="presentation" class="panel ${overdue ? 'panel-alert' : ''}" width="100%" cellpadding="0" cellspacing="0" style="background-color:${overdue ? '#fef2f2' : '#f9fafb'};border:1px solid ${overdue ? '#fecaca' : '#e5e7eb'};border-radius:8px;margin:8px 0 0;">
      <tr>
        <td style="padding:16px 20px;">
          <p class="muted" style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#5b6573;">Amount due</p>
          <p class="ink" style="margin:0;font-size:24px;font-weight:700;color:#0b1220;">${amount}</p>
        </td>
      </tr>
    </table>
    ${buttons}
    ${payUrl ? `<p class="muted" style="${MUTED}">Payments go straight to ${who}, not to Go Dottie.</p>` : `<p class="muted" style="${MUTED}">Bank transfer details are on the invoice.</p>`}
    <p class="muted" style="${MUTED}">If you have already paid, you can ignore this email.</p>
  `

  return {
    subject: overdue
      ? `Overdue: invoice ${invoiceNumber} from ${childminderName}`
      : `Reminder: invoice ${invoiceNumber} from ${childminderName}`,
    html: renderEmail(content, 'parent'),
  }
}

export function paymentReceivedEmail({
  parentName,
  childFirstName,
  invoiceNumber,
  total,
  paidDate,
  childminderName,
}: {
  parentName: string
  childFirstName: string
  invoiceNumber: string
  total: number
  paidDate: string
  childminderName: string
}): { subject: string; html: string } {
  const first = esc(parentName.split(' ')[0] || parentName)
  const amount = `£${total.toFixed(2)}`
  const who = esc(childminderName)

  const content = `
    <h1 class="ink" style="${H}">Payment received</h1>
    <p class="muted" style="${MUTED}">Invoice ${esc(invoiceNumber)} from ${who}</p>
    <p class="ink" style="${P}">
      Hi ${first}, <strong>${who}</strong> has confirmed your payment for ${esc(childFirstName)}'s childcare.
    </p>
    <table role="presentation" class="panel" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin:8px 0 16px;">
      <tr>
        <td style="padding:16px 20px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td class="muted" style="padding:2px 0;font-size:14px;color:#5b6573;">Invoice</td>
              <td class="ink" style="padding:2px 0;font-size:14px;color:#0b1220;font-weight:600;text-align:right;">${esc(invoiceNumber)}</td>
            </tr>
            <tr>
              <td class="muted" style="padding:2px 0;font-size:14px;color:#5b6573;">Amount paid</td>
              <td class="ink" style="padding:2px 0;font-size:14px;color:#0b1220;font-weight:600;text-align:right;">${amount}</td>
            </tr>
            <tr>
              <td class="muted" style="padding:2px 0;font-size:14px;color:#5b6573;">Date</td>
              <td class="ink" style="padding:2px 0;font-size:14px;color:#0b1220;font-weight:600;text-align:right;">${esc(paidDate)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <p class="muted" style="${MUTED}">No action needed. This confirmation is for your records.</p>
  `

  return {
    subject: `Payment received for invoice ${invoiceNumber}`,
    html: renderEmail(content, 'parent'),
  }
}

export function escalationEmail(input: {
  displayName?: string | null
  parentName?: string | null
  childName?: string | null
  reasons: string[]
  prospectId: string
}): { subject: string; html: string } {
  const who = [input.parentName || 'A parent', input.childName ? `(${input.childName})` : '']
    .filter(Boolean)
    .join(' ')
  const href = `${APP_URL}/enquiries/${encodeURIComponent(input.prospectId)}`
  const categories = (input.reasons.length ? input.reasons : ['something it could not answer'])
    .map((reason) => reason.replace(/\s*\(safeguarding word list\)/gi, '').replace(/^message mentions\s+/i, '').replace(/[.]+$/, '').trim())
  const hi = input.displayName ? `Hi ${esc(firstName(input.displayName))},` : 'Hi,'
  const content = `
    <h1 class="ink" style="${H}">Go Dottie needs you</h1>
    <p class="ink" style="${P}">${hi} ${esc(who)} emailed about a place.</p>
    ${categories.map((category) => `<p class="ink" style="${P}">It mentions ${esc(category)}, so Go Dottie didn't reply. Please answer this one yourself.</p>`).join('')}
    ${buttonGroup([filledButton('Review this enquiry', href)])}
    <p class="muted" style="${MUTED}">Nothing was sent to the parent.</p>
  `
  return {
    subject: `Needs you: ${who}`.slice(0, 120),
    html: renderEmail(content, 'account'),
  }
}

export function placeOfferEmail(input: {
  parentName?: string | null
  childName?: string | null
  childminderName?: string | null
  formUrl: string
  comprehensive?: boolean
}): { subject: string; html: string } {
  const parent = firstName(input.parentName || '') || 'there'
  const cm = input.childminderName || 'your childminder'
  const child = input.childName ? ` for ${input.childName}` : ''
  const extra = input.comprehensive
    ? 'You will also see policies and how invoices are paid.'
    : 'It only asks for your details and your child’s details.'
  const content = `
    <h1 class="ink" style="${H}">You have been offered a place${esc(child)}</h1>
    <p class="ink" style="${P}">
      Hi ${esc(parent)}, ${esc(cm)} would like you to complete a short signup form to confirm the place.
      ${esc(extra)}
    </p>
    ${buttonGroup([filledButton('Complete signup', input.formUrl)])}
    <p class="muted" style="${MUTED}">This link expires in 7 days.</p>
  `
  return {
    subject: `Place offered${child ? child : ''} — complete signup`,
    html: renderEmail(content, 'parent'),
  }
}

export function childOnboardedEmail(input: {
  displayName?: string | null
  childName?: string | null
  parentName?: string | null
  childId: string
}): { subject: string; html: string } {
  const hi = input.displayName ? `Hi ${esc(firstName(input.displayName))},` : 'Hi,'
  const child = input.childName || 'The child'
  const href = `${APP_URL}/invoices/new?child=${encodeURIComponent(input.childId)}`
  const content = `
    <h1 class="ink" style="${H}">${esc(child)} is onboarded</h1>
    <p class="ink" style="${P}">
      ${hi} ${esc(input.parentName || 'The parent')} completed the signup form. You can raise the first invoice when you are ready.
    </p>
    ${buttonGroup([filledButton('Create first invoice', href)])}
    ${accountSignoff()}
  `
  return {
    subject: `${child} is onboarded`,
    html: renderEmail(content, 'account'),
  }
}
