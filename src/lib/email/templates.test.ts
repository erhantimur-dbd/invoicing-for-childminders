import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'
import { welcomeEmail } from './templates.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

describe('welcomeEmail', () => {
  it('uses Welcome to Go Dottie with no emoji, and introduces the enquiries assistant', () => {
    const { subject, html } = welcomeEmail({ name: 'Sam Rivera' })
    assert.equal(subject, 'Welcome to Go Dottie, Sam')
    assert.doesNotMatch(subject, /\p{Extended_Pictographic}/u)
    assert.match(html, /Go Dottie, your enquiries assistant/)
    assert.doesNotMatch(html, /I'm Dottie|I'm Go Dottie/)
    assert.equal(html.replace(/Go Dottie/g, '').includes('Dottie'), false)
    assert.match(html, /background-color:#0b1220/)
    assert.doesNotMatch(html, /#059669|#047857|#10b981|#065f46|#f0fdf4|#b45309|#92400e|#fffbeb/)
  })
})

describe('customer email copy', () => {
  it('has no bare Dottie and no green or terracotta brand colours', () => {
    const files = [
      'lib/email/templates.ts',
      'lib/email/resend.ts',
      'app/api/invoices/send/route.ts',
      'app/api/contact/route.ts',
      'app/api/cron/generate-invoices/route.ts',
    ]
    const forbidden = /#059669|#047857|#10b981|#0ea5e9|#065f46|#166534|#f0fdf4|#bbf7d0|#ecfdf5|#b45309|#92400e|#d97706|#fffbeb|#fde68a/
    for (const rel of files) {
      const src = readFileSync(join(root, rel), 'utf8')
      assert.doesNotMatch(src, /I'm Dottie|I'm Go Dottie/)
      assert.equal(src.replace(/Go Dottie/g, '').includes('Dottie'), false, rel)
      assert.doesNotMatch(src, forbidden, rel)
    }
  })
})
