import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  callbackFailureRedirect,
  callbackSuccessPath,
  homepageAuthCallbackRedirect,
} from './auth-callback.ts'

describe('homepage auth-link redirect', () => {
  it('redirects /?code= to /auth/callback and preserves params', () => {
    const dest = homepageAuthCallbackRedirect(
      'https://godottie.cloud/?code=abc123&type=recovery&next=%2Freset-password&error=access_denied&error_description=Email+link+is+invalid',
    )
    assert.ok(dest)
    const url = new URL(dest)
    assert.equal(url.origin, 'https://godottie.cloud')
    assert.equal(url.pathname, '/auth/callback')
    assert.equal(url.searchParams.get('code'), 'abc123')
    assert.equal(url.searchParams.get('type'), 'recovery')
    assert.equal(url.searchParams.get('next'), '/reset-password')
    assert.equal(url.searchParams.get('error'), 'access_denied')
    assert.equal(url.searchParams.get('error_description'), 'Email link is invalid')
  })

  it('forwards an error without a code so the callback can show it', () => {
    const dest = homepageAuthCallbackRedirect(
      'https://www.godottie.cloud/?error=access_denied&error_description=Email+link+is+invalid+or+has+expired',
    )
    assert.ok(dest)
    const url = new URL(dest)
    assert.equal(url.pathname, '/auth/callback')
    assert.equal(url.searchParams.get('error'), 'access_denied')
    assert.equal(url.searchParams.get('error_description'), 'Email link is invalid or has expired')
  })

  it('without a code the homepage renders normally', () => {
    assert.equal(homepageAuthCallbackRedirect('https://www.godottie.cloud/'), null)
    assert.equal(homepageAuthCallbackRedirect('https://www.godottie.cloud/?utm=newsletter'), null)
    assert.equal(homepageAuthCallbackRedirect('https://godottie.cloud/login?code=abc'), null)
  })
})

describe('auth callback destination', () => {
  it('a recovery ends at /reset-password', () => {
    assert.equal(
      callbackSuccessPath(new URLSearchParams('code=abc&type=recovery')),
      '/reset-password',
    )
    assert.equal(
      callbackSuccessPath(new URLSearchParams('code=abc&next=/reset-password')),
      '/reset-password',
    )
  })

  it('sends a bare recovery code to /reset-password when the URL lost its type', () => {
    const sentAt = new Date('2026-10-03T08:00:00.000Z').toISOString()
    const now = Date.parse('2026-10-03T09:00:00.000Z')
    assert.equal(
      callbackSuccessPath(new URLSearchParams('code=abc'), { recovery_sent_at: sentAt }, now),
      '/reset-password',
    )
  })

  it('sends signup confirmation to the dashboard', () => {
    const staleRecovery = new Date('2026-09-01T08:00:00.000Z').toISOString()
    const now = Date.parse('2026-10-03T09:00:00.000Z')
    assert.equal(callbackSuccessPath(new URLSearchParams('code=abc')), '/dashboard')
    assert.equal(
      callbackSuccessPath(new URLSearchParams('code=abc'), { recovery_sent_at: staleRecovery }, now),
      '/dashboard',
    )
    assert.equal(
      callbackSuccessPath(new URLSearchParams('code=abc&type=signup'), { recovery_sent_at: new Date(now).toISOString() }, now),
      '/dashboard',
    )
    assert.equal(
      callbackSuccessPath(new URLSearchParams('code=abc&next=/onboarding')),
      '/onboarding',
    )
  })

  it('passes error and error_description through to the login error state', () => {
    const failed = new URL(
      callbackFailureRedirect(
        'https://godottie.cloud',
        new URLSearchParams('error=access_denied&error_description=Email+link+is+invalid+or+has+expired'),
      ),
    )
    assert.equal(failed.pathname, '/login')
    assert.equal(failed.searchParams.get('error'), 'access_denied')
    assert.equal(failed.searchParams.get('error_description'), 'Email link is invalid or has expired')

    const generic = new URL(callbackFailureRedirect('https://godottie.cloud', new URLSearchParams()))
    assert.equal(generic.pathname, '/login')
    assert.equal(generic.searchParams.get('error'), 'auth_callback_failed')
    assert.equal(generic.searchParams.get('error_description'), null)
  })
})
