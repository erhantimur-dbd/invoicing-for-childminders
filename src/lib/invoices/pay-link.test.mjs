import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { invoicePayButtonHtml, invoicePayHref } from './pay-link.mjs'

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
  assert.match(html, /Dottie does not take this payment/)
  assert.equal(invoicePayButtonHtml(null), '')
})

test('send email and public invoice gate Pay on the toggle', () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
  const send = readFileSync(join(root, 'app/api/invoices/send/route.ts'), 'utf8')
  assert.match(send, /invoicePayHref/)
  assert.match(send, /accept_online_payments/)
  const pub = readFileSync(join(root, 'app/invoice/[id]/page.tsx'), 'utf8')
  assert.match(pub, /accept_online_payments/)
  assert.match(pub, /Dottie does not take this payment/)
})
