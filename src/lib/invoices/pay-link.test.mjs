import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { invoicePayButtonHtml, invoicePayHref, PARENT_PAY_DISCLAIMER, PAY_DISCLAIMER } from './pay-link.mjs'

test('Pay is hidden when the toggle is off or there is no https link', () => {
  assert.equal(invoicePayHref({ acceptOnlinePayments: false, payUrl: 'https://www.paypal.com/paypalme/mary', status: 'sent' }), null)
  assert.equal(invoicePayHref({ acceptOnlinePayments: true, payUrl: '', status: 'sent' }), null)
  assert.equal(invoicePayHref({ acceptOnlinePayments: true, payUrl: 'javascript:alert(1)', status: 'sent' }), null)
  assert.equal(invoicePayHref({ acceptOnlinePayments: true, payUrl: 'https://buy.stripe.com/test', status: 'paid' }), null)
})

test('Pay href is the childminder link when the toggle is on', () => {
  const href = invoicePayHref({
    acceptOnlinePayments: true,
    payUrl: 'https://www.paypal.com/paypalme/mary',
    status: 'sent',
  })
  assert.equal(href, 'https://www.paypal.com/paypalme/mary')
  const html = invoicePayButtonHtml(href)
  assert.match(html, /Pay this invoice/)
  assert.match(html, /paypalme\/mary/)
  assert.match(html, /Dottie doesn't handle payments, refunds or disputes/)
  assert.equal(invoicePayButtonHtml(null), '')
})

test('Connect ready prefers the pay redirect over a pasted link', () => {
  const href = invoicePayHref({
    acceptOnlinePayments: true,
    payUrl: 'https://www.paypal.com/paypalme/mary',
    status: 'sent',
    connectReady: true,
    invoiceId: 'inv-1',
    origin: 'https://www.godottie.cloud',
    sig: 'abc',
  })
  assert.equal(href, 'https://www.godottie.cloud/api/invoices/pay/inv-1?sig=abc')
})

test('send email and public invoice gate Pay on the toggle', () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
  const send = readFileSync(join(root, 'app/api/invoices/send/route.ts'), 'utf8')
  assert.match(send, /invoicePayHref/)
  assert.match(send, /accept_online_payments/)
  assert.match(send, /connectReady/)
  const pub = readFileSync(join(root, 'app/invoice/[id]/page.tsx'), 'utf8')
  assert.match(pub, /accept_online_payments/)
  assert.match(pub, /PayDisclaimer/)
  const disclaimer = readFileSync(join(root, 'components/PayDisclaimer.tsx'), 'utf8')
  assert.match(disclaimer, /PAY_DISCLAIMER/)
  assert.match(disclaimer, /peer-hover:block/)
  const start = readFileSync(join(root, 'app/api/stripe/connect/start/route.ts'), 'utf8')
  assert.match(start, /createChildminderConnectAccount/)
  const pay = readFileSync(join(root, 'app/api/invoices/pay/[id]/route.ts'), 'utf8')
  assert.match(pay, /stripeAccount/)
  assert.doesNotMatch(pay, /application_fee_amount/)
  assert.doesNotMatch(pay, /payment_method_types/)
  assert.ok(PAY_DISCLAIMER.includes('own Stripe account'))
  assert.ok(PARENT_PAY_DISCLAIMER.includes('childminder'))
})
