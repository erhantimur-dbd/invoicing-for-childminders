// Render every customer email to HTML and full-page PNG (light and dark).
// Run: node --experimental-strip-types --import ./src/lib/register-test-hooks.mjs scripts/render-customer-emails.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as T from '../src/lib/email/templates.ts'
import {
  contactAutoReplyEmail,
  contactInboxNoticeEmail,
  invoiceSendEmail,
  weeklyDraftDigestEmail,
} from '../src/lib/email/transactional.ts'
import { authEmails, previewAuthHtml } from '../src/lib/email/auth-templates.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'docs/email-renders')
const markPath = join(root, 'public/email/go-dottie-mark.png')
mkdirSync(outDir, { recursive: true })

const rem = {
  parentName: 'Jordan Patel',
  childFirstName: 'Ava',
  invoiceNumber: 'INV-0042',
  total: 120,
  dueDate: '25 September 2026',
  publicUrl: 'https://www.godottie.cloud/invoice/00000000-0000-0000-0000-000000000042',
  payUrl: 'https://www.godottie.cloud/api/invoices/pay/00000000-0000-0000-0000-000000000042?sig=dummy',
  childminderName: 'Sam Taylor',
}

/** @type {Array<{ file: string, subject: string, html: string, trigger: string, parent: boolean, invoice: boolean, trialException?: boolean }>} */
const emails = []
const put = (file, mail, trigger, flags) => emails.push({ file, subject: mail.subject, html: mail.html, trigger, ...flags })

put('welcomeEmail', T.welcomeEmail({ name: 'Sam Taylor' }), 'Childminder signs up (welcome)', { parent: false, invoice: false })
put('paymentReminderEmail-reminder', T.paymentReminderEmail({ ...rem, overdue: false }), 'Hourly generate-invoices cron → sendDueReminders, invoice status=sent, reminder next_send_at passed', { parent: true, invoice: true })
put('paymentReminderEmail-overdue', T.paymentReminderEmail({ ...rem, overdue: true }), 'Hourly generate-invoices cron → sendDueReminders, invoice status=overdue', { parent: true, invoice: true })
put('paymentReceivedEmail', T.paymentReceivedEmail({ parentName: 'Jordan Patel', childFirstName: 'Ava', invoiceNumber: 'INV-0042', total: 120, paidDate: '2 October 2026', childminderName: 'Sam Taylor' }), 'Childminder marks invoice paid', { parent: true, invoice: true })
put('escalationEmail', T.escalationEmail({ displayName: 'Sam Taylor', parentName: 'Jordan Patel', childName: 'Ava', reasons: ['Parent asked about funded hours for a 2-year-old, which is not in your FAQ.', 'Message mentions a medical condition (safeguarding word list).'], prospectId: 'prospect-123' }), 'Enquiry sync: Go Dottie not confident / safeguarding hold → email to childminder', { parent: false, invoice: false })
put('placeOfferEmail', T.placeOfferEmail({ parentName: 'Jordan Patel', childName: 'Ava', childminderName: 'Sam Taylor', formUrl: 'https://www.godottie.cloud/onboard/dummy-token', comprehensive: true }), 'Childminder offers a place → parent signup form link', { parent: true, invoice: false })
put('childOnboardedEmail', T.childOnboardedEmail({ displayName: 'Sam Taylor', childName: 'Ava', parentName: 'Jordan Patel', childId: 'child-123' }), 'Parent completes signup form → email to childminder', { parent: false, invoice: false })
put('trialExpiringEmail', T.trialExpiringEmail({ name: 'Sam Taylor', daysLeft: 3, trialEnd: '5 October 2026' }), 'Stripe webhook customer.subscription.trial_will_end (still referenced in src/app/api/stripe/webhook/route.ts; skipped when metadata.product is enquiries)', { parent: false, invoice: false, trialException: true })
put('subscriptionConfirmEmail', T.subscriptionConfirmEmail({ name: 'Sam Taylor', plan: 'enquiries', startDate: '2 October 2026' }), 'Subscription confirmation template. No sender calls it on this branch.', { parent: false, invoice: false })
put('invoiceSend', invoiceSendEmail({
  invoiceNumber: 'INV-0042',
  total: 120,
  dueLabel: '16 October 2026',
  parentName: 'Jordan Patel',
  childFirstName: 'Ava',
  childminderName: 'Sam Taylor',
  childminderEmail: 'sam.taylor@example.com',
  childminderPhone: '07700 900123',
  items: [
    { description: 'Full days, w/c 21 Sep', quantity: 2, unitPrice: 50, amount: 100 },
    { description: 'Lunches', quantity: 4, unitPrice: 5, amount: 20 },
  ],
  bank: { bankName: 'Monzo', accountName: 'S Taylor', sortCode: '04-00-04', accountNumber: '12345678' },
  viewUrl: 'https://www.godottie.cloud/invoice/00000000-0000-0000-0000-000000000042',
  payUrl: 'https://www.godottie.cloud/api/invoices/pay/00000000-0000-0000-0000-000000000042?sig=dummy',
  notes: 'Thanks — Ava had a lovely week!',
}), 'Childminder clicks Send on an invoice (POST /api/invoices/send) → parent', { parent: true, invoice: true })
put('contactInboxNotice', contactInboxNoticeEmail({
  name: 'Sam Taylor',
  email: 'sam.taylor@example.com',
  subject: 'Question about funded hours',
  message: "Hi, I'm a childminder in Leeds with 4 children.\nDo you support 30 funded hours on invoices?\nThanks, Sam",
  ip: '203.0.113.7',
}), 'Contact form POST /api/contact → support@godottie.cloud (from "Go Dottie contact form <hello@godottie.cloud>")', { parent: false, invoice: false })
put('contactAutoReply', contactAutoReplyEmail({ name: 'Sam Taylor' }), 'Contact form POST /api/contact → auto-reply to the sender (from "Go Dottie <hello@godottie.cloud>"). The form has no childminder or setting name, so the body is an acknowledgement and does not sell Go Dottie.', { parent: true, invoice: false })
put('weeklyDraftDigest', weeklyDraftDigestEmail({
  firstName: 'Sam',
  weekLabel: '21 Sept – 27 Sept 2026',
  created: [
    { child_name: 'Ava Patel', total: 120, agent_notes: '2 full days + lunches' },
    { child_name: 'Leo Brown', total: 187.5, agent_notes: null },
    { child_name: 'Mia Khan', total: 95, agent_notes: '15 funded hours deducted' },
  ],
  skipped: [{ child_name: 'Noah Smith', reason: 'No scheduled days this week' }],
  invoicesUrl: 'https://www.godottie.cloud/invoices',
}), "Hourly generate-invoices cron, on each childminder's invoice_day/invoice_hour (UTC) when at least 1 draft is created → childminder profile.email", { parent: false, invoice: true })

for (const auth of authEmails()) {
  put(auth.renderFile, { subject: auth.subject, html: previewAuthHtml(auth.html) }, auth.trigger, { parent: false, invoice: false })
}

function verdict(ok) {
  return ok ? 'pass' : 'fail'
}

function rulesFor(email) {
  const text = `${email.subject}\n${email.html}`
  const bare = (text.match(/(?<!Go )Dottie/g) ?? []).length === 0
  const emerald = !text.includes('#059669')
  const emoji = !/\p{Extended_Pictographic}/u.test(text)
  const trial = !/\btrial\b/i.test(text)
  const receipt = !/\breceipt\b/i.test(text)
  const renewal = !/remind you before renewal/i.test(text)
  const monthly = !/\/mo\b|\/month\b|\ba month\b|\bper month\b|\bmonthly\b/i.test(text)
  const banned = !/£244\b/.test(text)
  const whole = [...text.matchAll(/£(\d+)(?![.\d])/g)].map((match) => match[1])
  const wholeOk = whole.every((n) => ['160', '208', '280'].includes(n))
  const penceOk = email.invoice || !/£\d+\.\d/.test(text)
  const prices = monthly && banned && wholeOk && penceOk
  let parent = true
  if (email.parent) {
    const sells = /enquiries assistant|Start with Enquiries|£160 a year/.test(email.html)
    const footer = /Sent with Go Dottie/.test(email.html)
    const named = email.file === 'contactAutoReply' || /Sam Taylor/.test(email.html)
    parent = footer && !sells && named
  }
  return [
    `bare Dottie: ${verdict(bare)}`,
    `#059669: ${verdict(emerald)}`,
    `emoji: ${verdict(emoji)}`,
    `no "trial": ${verdict(trial)}${email.trialException && !trial ? ' (still sent by the Stripe trial_will_end webhook, so the function was kept)' : ''}`,
    `no "receipt": ${verdict(receipt)}`,
    `no "we'll remind you before renewal": ${verdict(renewal)}`,
    `prices only £160, £208 or £280 (no £244, no monthly): ${verdict(prices)}`,
    `parent voice: ${email.parent ? verdict(parent) : 'pass (not a parent email)'}`,
  ]
}

const lines = [
  '# Go Dottie email renders',
  '',
  'Light PNGs are 700px wide, full page. Dark PNGs use Playwright `colorScheme: \'dark\'` so `prefers-color-scheme: dark` applies. The mark is served from `public/email/go-dottie-mark.png` for the screenshot; the HTML references `https://www.godottie.cloud/email/go-dottie-mark.png`.',
  '',
  'Dummy data: Sam Taylor / Ava / Jordan Patel / INV-0042 £120.00. Subscription start date: 2 October 2026.',
  '',
]
for (const email of emails) {
  writeFileSync(join(outDir, `${email.file}.html`), email.html)
  lines.push(`## ${email.file}`)
  lines.push('')
  lines.push(`- Subject: ${email.subject}`)
  lines.push(`- Trigger: ${email.trigger}`)
  lines.push(`- Files: \`${email.file}.html\`, \`${email.file}.png\`, \`${email.file}-dark.png\``)
  for (const rule of rulesFor(email)) lines.push(`- ${rule}`)
  lines.push('')
}
writeFileSync(join(outDir, 'INDEX.md'), lines.join('\n'))

const { chromium } = await import('playwright')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 700, height: 800 } })
await page.route('https://www.godottie.cloud/email/go-dottie-mark.png', (route) => route.fulfill({ path: markPath, contentType: 'image/png' }))

for (const email of emails) {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.setContent(email.html, { waitUntil: 'networkidle' })
  await page.screenshot({ path: join(outDir, `${email.file}.png`), fullPage: true })
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.setContent(email.html, { waitUntil: 'networkidle' })
  await page.screenshot({ path: join(outDir, `${email.file}-dark.png`), fullPage: true })
  console.log(email.file)
}
await browser.close()
console.log(`wrote ${emails.length} emails to ${outDir}`)
