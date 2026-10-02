import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  childOnboardedEmail,
  escalationEmail,
  paymentReceivedEmail,
  paymentReminderEmail,
  placeOfferEmail,
  subscriptionConfirmEmail,
  welcomeEmail,
} from './templates.ts'
import { emailAssetOrigin, PRODUCTION_ORIGIN } from './layout.ts'
import {
  contactAutoReplyEmail,
  contactInboxNoticeEmail,
  invoiceSendEmail,
  weeklyDraftDigestEmail,
} from './transactional.ts'
import { authEmails, previewAuthHtml } from './auth-templates.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const rem = {
  parentName: 'Jordan Patel',
  childFirstName: 'Ava',
  invoiceNumber: 'INV-0042',
  total: 120,
  dueDate: '25 September 2026',
  publicUrl: 'https://www.godottie.cloud/invoice/inv',
  payUrl: 'https://www.godottie.cloud/api/invoices/pay/inv?sig=dummy',
  childminderName: 'Sam Taylor',
}

function textOf(mail: { subject: string; html: string }) {
  return `${mail.subject}\n${mail.html}`
}

function bareDottie(text: string) {
  return text.match(/(?<!Go )Dottie/g) ?? []
}

test('welcome subject and enquiries line', () => {
  const mail = welcomeEmail({ name: 'Sam Taylor' })
  assert.equal(mail.subject, 'Welcome to Go Dottie, Sam')
  assert.match(mail.html, /Go Dottie, your enquiries assistant/)
  assert.match(mail.html, /Answer parent enquiries from your Gmail, in your voice/)
  assert.match(mail.html, /Offer visits in hours you set/)
  assert.match(mail.html, /Send a signup form when you offer a place/)
  assert.match(mail.html, /Connect your Gmail/)
  assert.doesNotMatch(textOf(mail), /Start with Enquiries/)
  assert.doesNotMatch(textOf(mail), /\p{Extended_Pictographic}/u)
})

test('subscription confirmation copy', () => {
  const mail = subscriptionConfirmEmail({
    name: 'Sam Taylor',
    plan: 'enquiries',
    startDate: '2 October 2026',
  })
  const html = mail.html
  const plan = html.indexOf("You're on Go Dottie Enquiries, £160 a year.")
  const started = html.indexOf('Your plan started on 2 October 2026.')
  const manage = html.indexOf('manage or cancel any time in Settings')
  assert.ok(plan !== -1 && started !== -1 && manage !== -1)
  assert.ok(plan < started && started < manage)
  assert.doesNotMatch(textOf(mail), /remind you before renewal/i)
  assert.doesNotMatch(textOf(mail), /\breceipt\b/i)
  assert.doesNotMatch(textOf(mail), /\btrial\b/i)
})

test('invoice stacks pay above view with 12px between them', () => {
  const mail = invoiceSendEmail({
    invoiceNumber: 'INV-0042',
    total: 120,
    dueLabel: '16 October 2026',
    parentName: 'Jordan Patel',
    childFirstName: 'Ava',
    childminderName: 'Sam Taylor',
    childminderEmail: 'sam.taylor@example.com',
    childminderPhone: '07700 900123',
    items: [{ description: 'Full days', quantity: 2, unitPrice: 50, amount: 100 }],
    bank: { bankName: 'Monzo', accountName: 'S Taylor', sortCode: '04-00-04', accountNumber: '12345678' },
    viewUrl: 'https://www.godottie.cloud/invoice/inv',
    payUrl: 'https://www.godottie.cloud/api/invoices/pay/inv?sig=dummy',
    notes: 'Thanks',
  })
  const pay = mail.html.indexOf('Pay this invoice')
  const view = mail.html.indexOf('View invoice')
  assert.ok(pay !== -1 && view !== -1 && pay < view)
  assert.match(mail.html.slice(pay, view), /height:12px/)
  assert.match(mail.html, /btn-fill/)
  assert.match(mail.html, /btn-outline/)
  assert.match(mail.html, /padding:12px 28px/)
  assert.match(mail.html, /line-height:20px/)
  assert.match(mail.html, /Sent with Go Dottie/)
  assert.match(mail.html, /class="panel"/)
  assert.match(mail.html, /Payments go straight to Sam Taylor, not to Go Dottie\./)
  assert.match(mail.html, /Sam Taylor/)
  assert.doesNotMatch(textOf(mail), /enquiries assistant/)
})

test('every customer email uses the shared navy layout and passes copy rules', () => {
  const mails: Array<{ name: string; parent: boolean; invoice: boolean; mail: { subject: string; html: string } }> = [
    { name: 'welcome', parent: false, invoice: false, mail: welcomeEmail({ name: 'Sam Taylor' }) },
    { name: 'reminder', parent: true, invoice: true, mail: paymentReminderEmail({ ...rem, overdue: false }) },
    { name: 'overdue', parent: true, invoice: true, mail: paymentReminderEmail({ ...rem, overdue: true }) },
    { name: 'received', parent: true, invoice: true, mail: paymentReceivedEmail({ parentName: 'Jordan Patel', childFirstName: 'Ava', invoiceNumber: 'INV-0042', total: 120, paidDate: '2 October 2026', childminderName: 'Sam Taylor' }) },
    { name: 'escalation', parent: false, invoice: false, mail: escalationEmail({ displayName: 'Sam Taylor', parentName: 'Jordan Patel', childName: 'Ava', reasons: ['Funded hours'], prospectId: 'prospect-123' }) },
    { name: 'place', parent: true, invoice: false, mail: placeOfferEmail({ parentName: 'Jordan Patel', childName: 'Ava', childminderName: 'Sam Taylor', formUrl: 'https://www.godottie.cloud/onboard/dummy', comprehensive: true }) },
    { name: 'onboarded', parent: false, invoice: false, mail: childOnboardedEmail({ displayName: 'Sam Taylor', childName: 'Ava', parentName: 'Jordan Patel', childId: 'child-123' }) },
    { name: 'confirm', parent: false, invoice: false, mail: subscriptionConfirmEmail({ name: 'Sam Taylor', plan: 'enquiries', startDate: '2 October 2026' }) },
    { name: 'invoice', parent: true, invoice: true, mail: invoiceSendEmail({ invoiceNumber: 'INV-0042', total: 120, dueLabel: '16 October 2026', parentName: 'Jordan Patel', childFirstName: 'Ava', childminderName: 'Sam Taylor', childminderEmail: 'sam.taylor@example.com', childminderPhone: '07700 900123', items: [], bank: null, viewUrl: 'https://www.godottie.cloud/invoice/inv', payUrl: 'https://www.godottie.cloud/pay', notes: null }) },
    { name: 'inbox', parent: false, invoice: false, mail: contactInboxNoticeEmail({ name: 'Sam Taylor', email: 'sam.taylor@example.com', subject: 'Question about funded hours', message: 'Do you support funded hours?', ip: '203.0.113.7' }) },
    { name: 'reply', parent: false, invoice: false, mail: contactAutoReplyEmail({ name: 'Sam Taylor' }) },
    { name: 'digest', parent: false, invoice: true, mail: weeklyDraftDigestEmail({ firstName: 'Sam', weekLabel: '21 Sept – 27 Sept 2026', created: [{ child_name: 'Ava Patel', total: 120, agent_notes: '2 full days' }], skipped: [{ child_name: 'Noah Smith', reason: 'No scheduled days this week' }], invoicesUrl: 'https://www.godottie.cloud/invoices' }) },
  ]

  for (const row of mails) {
    const text = textOf(row.mail)
    assert.deepEqual(bareDottie(text), [], row.name)
    assert.equal(text.includes('#059669'), false, row.name)
    assert.equal(text.includes('#10b981'), false, row.name)
    assert.equal(text.includes('#0ea5e9'), false, row.name)
    assert.doesNotMatch(text, /\p{Extended_Pictographic}/u, row.name)
    assert.doesNotMatch(text, /\breceipt\b/i, row.name)
    assert.doesNotMatch(text, /remind you before renewal/i, row.name)
    assert.doesNotMatch(text, /£244\b/, row.name)
    assert.doesNotMatch(text, /\/mo\b|\/month\b|\ba month\b|\bper month\b|\bmonthly\b/i, row.name)
    const whole = [...text.matchAll(/£(\d+)(?![.\d])/g)].map((match) => match[1])
    assert.deepEqual(whole.filter((n) => !['160', '208', '280'].includes(n)), [], row.name)
    if (!row.invoice) assert.doesNotMatch(text, /£\d+\.\d/, row.name)
    assert.match(row.mail.html, /name="color-scheme" content="light dark"/, row.name)
    assert.match(row.mail.html, /name="supported-color-schemes" content="light dark"/, row.name)
    assert.match(row.mail.html, /prefers-color-scheme:\s*dark/, row.name)
    assert.match(row.mail.html, /\[data-ogsc\]/, row.name)
    assert.match(row.mail.html, /\[data-ogsb\]/, row.name)
    assert.match(row.mail.html, /src="https:\/\/www\.godottie\.cloud\/email\/go-dottie-mark\.png"/, row.name)
    assert.match(row.mail.html, /\.panel \{[^}]*color:#f9fafb !important/, row.name)
    assert.match(row.mail.html, /\[data-ogsc\] \.panel/, row.name)
    assert.match(row.mail.html, /\.btn-fill \{[^}]*background-color:#f9fafb !important; border:none !important/, row.name)
    assert.match(row.mail.html, /a\.btn-fill-link \{[^}]*color:#0b1220 !important/, row.name)
    assert.match(row.mail.html, /border-top:1px solid #374151 !important/, row.name)
    assert.doesNotMatch(row.mail.html, /outline:1px/, row.name)
    assert.match(row.mail.html, /<title>Go Dottie<\/title>/, row.name)
    assert.match(row.mail.html, /width="40"/, row.name)
    if (row.parent) {
      assert.match(row.mail.html, /Sent with Go Dottie/, row.name)
      assert.doesNotMatch(row.mail.html, /enquiries assistant|Start with Enquiries|£160 a year/, row.name)
    }
    assert.doesNotMatch(text, /\btrial\b/i, row.name)
    if (row.name === 'reply') {
      assert.match(row.mail.html, /The Go Dottie team/, row.name)
      assert.doesNotMatch(row.mail.html, /Sent with Go Dottie/, row.name)
    }
  }
})

test('supabase auth templates stay on the shared layout', () => {
  const readme = readFileSync(join(root, '../supabase/templates/auth/README.md'), 'utf8')
  assert.match(readme, /Sender name for every template: \*\*Go Dottie\*\*/)
  assert.match(readme, /\{\{ \.ConfirmationURL \}\}`? must stay exactly as it is/)
  assert.match(readme, /Do not change the redirect URLs/)
  assert.doesNotMatch(readme, /\[auth\.email\.template/)
  assert.doesNotMatch(readme, /content_path/)
  for (const email of authEmails()) {
    const file = readFileSync(join(root, '../supabase/templates/auth', email.file), 'utf8')
    assert.equal(file, email.html, email.file)
    assert.match(readme, new RegExp(email.subject.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    const text = `${email.subject}\n${email.html}`
    assert.deepEqual(bareDottie(text), [], email.id)
    assert.equal(text.includes('#059669'), false, email.id)
    assert.doesNotMatch(text, /\p{Extended_Pictographic}/u, email.id)
    assert.doesNotMatch(text, /\btrial\b/i, email.id)
    assert.doesNotMatch(text, /\breceipt\b/i, email.id)
    assert.doesNotMatch(text, /remind you before renewal/i, email.id)
    assert.match(email.html, /name="color-scheme" content="light dark"/)
    assert.match(email.html, /\[data-ogsc\]/)
    assert.match(email.html, /https:\/\/www\.godottie\.cloud\/email\/go-dottie-mark\.png/)
    if (email.id === 'reauthentication') {
      assert.match(email.html, /\{\{ \.Token \}\}/)
      assert.match(email.html, /\{\{ \.Email \}\}/)
      assert.match(email.html, /\{\{ \.SiteURL \}\}/)
      assert.doesNotMatch(email.html, /If you didn't ask for this/)
    } else {
      assert.match(email.html, /\{\{ \.ConfirmationURL \}\}/)
      assert.match(email.html, /\{\{ \.Token \}\}/)
      assert.match(email.html, /btn-fill/)
      assert.match(email.html, /padding:12px 28px/)
      if (email.id === 'invite') assert.doesNotMatch(email.html, /If you didn't ask for this/)
      else assert.match(email.html, /If you didn't ask for this, you can ignore this email\./)
    }
    assert.doesNotMatch(previewAuthHtml(email.html), /\{\{/)
  }
  assert.match(authEmails().find((email) => email.id === 'email_change')!.html, /\{\{ \.NewEmail \}\}/)
  assert.match(authEmails().find((email) => email.id === 'invite')!.html, /\{\{ \.SiteURL \}\}/)
})

test('sender names and the live trial email hook', () => {
  const resend = readFileSync(join(root, 'lib/email/resend.ts'), 'utf8')
  const contact = readFileSync(join(root, 'app/api/contact/route.ts'), 'utf8')
  const digest = readFileSync(join(root, 'app/api/cron/generate-invoices/route.ts'), 'utf8')
  const webhook = readFileSync(join(root, 'app/api/stripe/webhook/route.ts'), 'utf8')
  assert.match(resend, /Go Dottie <hello@godottie\.cloud>/)
  assert.match(contact, /Go Dottie contact form <hello@godottie\.cloud>/)
  assert.match(contact, /Go Dottie <hello@godottie\.cloud>/)
  assert.match(digest, /Go Dottie <invoices@godottie\.cloud>/)
  assert.deepEqual(bareDottie(`${resend}\n${contact}\n${digest}`), [])
  assert.doesNotMatch(webhook, /trialExpiringEmail/)
  assert.doesNotMatch(webhook, /sendEmail/)
})

test('trial_will_end is logged and does not email or write', () => {
  const webhook = readFileSync(join(root, 'app/api/stripe/webhook/route.ts'), 'utf8')
  const start = webhook.indexOf("case 'customer.subscription.trial_will_end'")
  const end = webhook.indexOf("case 'customer.subscription.created'")
  const block = webhook.slice(start, end)
  assert.ok(start !== -1 && end > start)
  assert.match(block, /log\.info\('trial_will_end'/)
  assert.doesNotMatch(block, /supabase|sendEmail|trialExpiringEmail|from\('subscriptions'\)|from\('profiles'\)/)
})

test('the mark URL is the configured site, and production is always godottie.cloud', () => {
  const previousEnv = process.env.VERCEL_ENV
  const previousApp = process.env.NEXT_PUBLIC_APP_URL
  const previousVercel = process.env.VERCEL_URL
  try {
    delete process.env.VERCEL_ENV
    delete process.env.NEXT_PUBLIC_APP_URL
    process.env.VERCEL_URL = 'preview-host.vercel.app'
    assert.equal(emailAssetOrigin(), PRODUCTION_ORIGIN)

    process.env.VERCEL_ENV = 'production'
    process.env.NEXT_PUBLIC_APP_URL = 'https://preview.example'
    assert.equal(emailAssetOrigin(), PRODUCTION_ORIGIN)

    process.env.VERCEL_ENV = 'preview'
    process.env.NEXT_PUBLIC_APP_URL = 'https://invoicing-preview.example'
    assert.equal(emailAssetOrigin(), 'https://invoicing-preview.example')

    delete process.env.NEXT_PUBLIC_APP_URL
    assert.equal(emailAssetOrigin(), PRODUCTION_ORIGIN)
  } finally {
    if (previousEnv === undefined) delete process.env.VERCEL_ENV
    else process.env.VERCEL_ENV = previousEnv
    if (previousApp === undefined) delete process.env.NEXT_PUBLIC_APP_URL
    else process.env.NEXT_PUBLIC_APP_URL = previousApp
    if (previousVercel === undefined) delete process.env.VERCEL_URL
    else process.env.VERCEL_URL = previousVercel
  }
})
