import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { companionCta, enquiriesEntryPoints, enquiriesSignupCta, freeTrialAnswerParts } from './enquiries-signup.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel) => readFileSync(join(root, rel), 'utf8')

test('isPaidSignupOpen true keeps Sign up on /signup', () => {
  const cta = enquiriesSignupCta(true)
  assert.equal(cta.href, '/signup')
  assert.equal(cta.label, 'Sign up')
  assert.equal(cta.filled, true)
  const trial = freeTrialAnswerParts(true)
  assert.match(trial.text, /sign up for Enquiries at £160 a year/)
  assert.equal(trial.href, null)
})

test('closed payments render no Enquiries signup link', () => {
  const points = enquiriesEntryPoints(false)
  const blob = JSON.stringify(points)
  assert.doesNotMatch(blob, /\/signup/)
  assert.doesNotMatch(blob, /product=enquiries/)
  assert.doesNotMatch(blob, /sign up for Enquiries/)
  assert.equal(points.header.href, '/demo')
  assert.equal(points.header.label, 'Book a demo')
  assert.equal(points.hero.label, 'Book a demo')
  assert.equal(points.pricingCard.href, '/demo')
  assert.equal(points.pricingCard.label, 'Book a demo')
  assert.equal(points.pricingCard.filled, true)
  assert.equal(points.limited.filled, false)
  assert.equal(points.full.filled, false)
  assert.equal(points.faq.href, '/demo')
  assert.equal(points.faq.linkLabel, 'Book a demo')
  assert.equal(points.signup, '/demo')
  assert.equal(points.subscribeEnquiries, '/demo')
  assert.deepEqual(companionCta(false), { href: '/login', label: 'Sign in' })
  assert.deepEqual(companionCta(true), { href: '/demo', label: 'Book a demo' })
})

test('every Enquiries signup surface calls the payments-open gate', () => {
  const gated = [
    'components/marketing/SiteHeader.tsx',
    'components/marketing/SiteFooter.tsx',
    'components/marketing/Pricing.tsx',
    'components/marketing/EnquiriesSignupLink.tsx',
    'components/MobileNav.tsx',
    'app/page.tsx',
    'app/faq/page.tsx',
    'app/demo/page.tsx',
    'app/support/page.tsx',
    'app/(auth)/login/page.tsx',
    'app/(auth)/signup/layout.tsx',
    'app/subscribe/page.tsx',
    'app/(dashboard)/dashboard/page.tsx',
    'app/(dashboard)/enquiries/layout.tsx',
    'app/api/email/welcome/route.ts',
    'app/api/stripe/create-checkout/route.ts',
  ]
  for (const rel of gated) {
    const src = read(rel)
    assert.match(src, /readPaidSignupOpen|isPaidSignupOpen|enquiriesSignupCta|EnquiriesSignupLink|paymentsOpen|signupHref/)
  }
  const pricing = read('components/marketing/Pricing.tsx')
  assert.match(pricing, /paymentsOpen \? enquiriesHref : '\/demo'/)
  assert.match(pricing, /Book a demo/)
  assert.match(pricing, /bg-\[#0b1220\]/)
  assert.match(pricing, /border border-\[#0b1220\] bg-white/)
  const signup = read('app/(auth)/signup/layout.tsx')
  assert.match(signup, /redirect\('\/demo'\)/)
  const subscribe = read('app/subscribe/page.tsx')
  assert.match(subscribe, /product === 'enquiries'/)
  assert.match(subscribe, /redirect\('\/demo'\)/)
  const faq = read('app/faq/page.tsx')
  assert.match(faq, /freeTrialAnswerParts/)
  assert.match(faq, /trial\.href/)
  const runtime = read('lib/paid-signup-render.ts')
  assert.match(runtime, /connection\(\)/)
  assert.match(runtime, /VERCEL_ENV === 'production'/)
  assert.match(runtime, /isPaidSignupOpen/)
})
