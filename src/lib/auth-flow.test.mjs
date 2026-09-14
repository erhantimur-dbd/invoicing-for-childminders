import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { passwordIsStrong, passwordRequirements, passwordScore } from './password-policy.mjs'
import { SIGN_UP_CTA } from './plans-copy.mjs'
import { parseBilling, withBilling, authCallbackRedirect, subscribeNext } from './billing-query.mjs'
import { AUTH_CALLBACK_FAILED, loginErrorFromQuery } from './auth-errors.mjs'
import { checkoutLanded } from './enquiries/access.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel) => readFileSync(join(root, rel), 'utf8')

test('honesty copy: Sign up CTA is not "Sign up free"', () => {
  assert.equal(SIGN_UP_CTA, 'Sign up')
  const login = read('app/(auth)/login/page.tsx')
  assert.match(login, /SIGN_UP_CTA/)
  assert.doesNotMatch(login, /Sign up free/)
})

test('reset page tells the user when the link is not valid', () => {
  const reset = read('app/(auth)/reset-password/page.tsx')
  assert.match(reset, /This reset link is not valid/)
  assert.match(reset, /getSession/)
  assert.match(reset, /PASSWORD_RECOVERY/)
  assert.match(reset, /passwordIsStrong/)
})

test('password policy requires length, upper, number and special', () => {
  assert.equal(passwordIsStrong('short'), false)
  assert.equal(passwordIsStrong('nouppercase1!'), false)
  assert.equal(passwordIsStrong('NoNumber!'), false)
  assert.equal(passwordIsStrong('NoSpecial1'), false)
  assert.equal(passwordIsStrong('GoodPass1!'), true)
  assert.equal(passwordScore('GoodPass1!'), 4)
  assert.deepEqual(
    passwordRequirements('GoodPass1!').map((r) => r.met),
    [true, true, true, true],
  )
  const signup = read('app/(auth)/signup/page.tsx')
  assert.match(signup, /passwordIsStrong/)
  const meter = read('components/PasswordStrength.tsx')
  assert.match(meter, /passwordScore/)
})

test('signup, reset, login and checkout persist billing and callback URLs', () => {
  assert.equal(parseBilling('monthly'), 'monthly')
  assert.equal(parseBilling('annual'), 'annual')
  assert.equal(parseBilling(null), 'annual')
  assert.match(withBilling('/subscribe?product=enquiries', 'annual'), /billing=annual/)
  assert.equal(subscribeNext('annual'), '/subscribe?product=enquiries&billing=annual')
  assert.equal(subscribeNext('monthly'), '/subscribe?product=enquiries&billing=monthly')
  assert.match(authCallbackRedirect('https://www.godottie.cloud', '/subscribe?billing=annual'), /\/auth\/callback\?next=/)

  const signup = read('app/(auth)/signup/page.tsx')
  assert.match(signup, /emailRedirectTo/)
  assert.match(signup, /authCallbackRedirect/)
  assert.match(signup, /subscribeNext/)
  assert.match(signup, /data\.session/)
  assert.match(signup, /Check your inbox/)
  assert.ok(signup.indexOf('I agree to Dottie') < signup.indexOf('Create account'))

  const forgot = read('app/(auth)/forgot-password/page.tsx')
  assert.match(forgot, /authCallbackRedirect/)
  assert.match(forgot, /\/reset-password/)

  const login = read('app/(auth)/login/page.tsx')
  assert.match(login, /setError/)
  assert.match(login, /ssoError/)
  const sso = read('components/SSOButtons.tsx')
  assert.match(sso, /onError/)
  assert.match(sso, /authCallbackRedirect/)
  assert.match(sso, /subscribeNext/)

  const checkout = read('app/api/stripe/create-checkout/route.ts')
  assert.match(checkout, /plan/)
  const subscribe = read('app/subscribe/page.tsx')
  assert.match(subscribe, /searchParams\.get\('billing'\)/)
  assert.match(subscribe, /plan: billing/)
})

test('login surfaces auth/callback SSO failures inline', () => {
  assert.equal(loginErrorFromQuery(null), null)
  assert.equal(loginErrorFromQuery('auth_callback_failed'), AUTH_CALLBACK_FAILED)
  const login = read('app/(auth)/login/page.tsx')
  assert.match(login, /loginErrorFromQuery/)
  const callback = read('app/auth/callback/route.ts')
  assert.match(callback, /login\?error=auth_callback_failed/)
  assert.match(callback, /exchangeCodeForSession/)
})

test('signup lands on Enquiries subscribe; proxy splits the two products', () => {
  const signup = read('app/(auth)/signup/page.tsx')
  assert.match(signup, /subscribeNext/)
  assert.match(signup, /product=enquiries/)
  assert.match(signup, /Create account/)
  assert.ok(signup.indexOf('I agree to Dottie') < signup.indexOf('Create account'))

  const proxy = read('proxy.ts')
  assert.match(proxy, /\/children/)
  assert.match(proxy, /\/invoices/)
  assert.match(proxy, /product=invoicing/)
  assert.match(proxy, /product=enquiries/)
  assert.match(proxy, /needsInvoicing/)

  const enquiriesLayout = read('app/(dashboard)/enquiries/layout.tsx')
  assert.match(enquiriesLayout, /enquiriesActive/)
  assert.match(enquiriesLayout, /EnquiriesPaywall/)

  const checkout = read('app/api/stripe/create-checkout/route.ts')
  assert.match(checkout, /product === 'enquiries'/)
  assert.match(checkout, /resolveEnquiriesPriceId/)
  assert.match(checkout, /resolveInvoicingPriceId/)

  const subscribe = read('app/subscribe/page.tsx')
  assert.match(subscribe, /get\('product'\) !== 'invoicing'/)
  assert.match(subscribe, /Start Dottie/)
  assert.match(subscribe, /Add invoicing/)
})

test('paid Enquiries checkout sets enquiries_status; success polls status not Stripe IDs', () => {
  assert.equal(checkoutLanded('enquiries', { enquiries_status: 'active' }), true)
  assert.equal(checkoutLanded('enquiries', { enquiries_stripe_subscription_id: 'sub_x' }), false)
  assert.equal(checkoutLanded('invoicing', { status: 'active' }), true)
  assert.equal(checkoutLanded('invoicing', { stripe_subscription_id: 'sub_y' }), false)

  const webhook = read('app/api/stripe/webhook/route.ts')
  const checkoutCase = webhook.slice(
    webhook.indexOf("checkout.session.completed"),
    webhook.indexOf("customer.subscription.trial_will_end"),
  )
  assert.match(checkoutCase, /enquiries_status/)
  assert.match(checkoutCase, /payment_status/)
  assert.match(checkoutCase, /'active'/)

  const success = read('app/subscribe/success/page.tsx')
  assert.match(success, /checkoutLanded/)
  assert.doesNotMatch(success, /Boolean\(j\.subscription\?\.enquiries_stripe_subscription_id\)/)
  assert.doesNotMatch(success, /Boolean\(j\.subscription\?\.stripe_subscription_id\)/)
})
