import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { clearPaidSignupCache, isPaidSignupOpen } from './prices.ts'

const liveEnv = {
  VERCEL_ENV: 'production',
  STRIPE_SECRET_KEY: 'sk_live_test',
  STRIPE_ENQUIRIES_ANNUAL_PRICE_ID: 'price_live_annual',
}

afterEach(() => {
  clearPaidSignupCache()
})

describe('isPaidSignupOpen', () => {
  it('returns true on Preview and in development without calling Stripe', async () => {
    let calls = 0
    const lookup = async () => {
      calls += 1
      return { livemode: false, active: false }
    }
    assert.equal(await isPaidSignupOpen({ VERCEL_ENV: 'preview' }, lookup), true)
    assert.equal(await isPaidSignupOpen({ VERCEL_ENV: 'development' }, lookup), true)
    assert.equal(await isPaidSignupOpen({}, lookup), true)
    assert.equal(calls, 0)
  })

  it('returns true in production when the annual price is live and active', async () => {
    const open = await isPaidSignupOpen(liveEnv, async () => ({ livemode: true, active: true }))
    assert.equal(open, true)
  })

  it('returns false in production when the env var is missing, the key is not live, or the price is not live', async () => {
    let calls = 0
    const lookup = async () => {
      calls += 1
      return { livemode: true, active: true }
    }
    assert.equal(await isPaidSignupOpen({ VERCEL_ENV: 'production' }, lookup), false)
    assert.equal(
      await isPaidSignupOpen({
        VERCEL_ENV: 'production',
        STRIPE_ENQUIRIES_ANNUAL_PRICE_ID: 'price_live_annual',
        STRIPE_SECRET_KEY: 'sk_test_abc',
      }, lookup),
      false,
    )
    assert.equal(calls, 0)

    assert.equal(
      await isPaidSignupOpen(liveEnv, async () => ({ livemode: false, active: true })),
      false,
    )
    clearPaidSignupCache()
    assert.equal(
      await isPaidSignupOpen(liveEnv, async () => ({ livemode: true, active: false })),
      false,
    )
    clearPaidSignupCache()
    assert.equal(await isPaidSignupOpen(liveEnv, async () => { throw new Error('stripe down') }), false)
  })

  it('caches the Stripe lookup', async () => {
    let calls = 0
    const lookup = async () => {
      calls += 1
      return { livemode: true, active: true }
    }
    assert.equal(await isPaidSignupOpen(liveEnv, lookup), true)
    assert.equal(await isPaidSignupOpen(liveEnv, lookup), true)
    assert.equal(calls, 1)
  })
})
