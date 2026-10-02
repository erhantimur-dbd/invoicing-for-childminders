import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  ENQUIRIES_CHECKOUT_UNAVAILABLE,
  GO_DOTTIE_ENQUIRIES_PRICE_ID,
  enquiriesProductionPriceRefusal,
  resolveEnquiriesPriceId,
} from './prices.ts'

const SANDBOX = 'price_1UDvB2B9AB27n7OAFxVLPfDD'

describe('resolveEnquiriesPriceId', () => {
  it('uses STRIPE_ENQUIRIES_ANNUAL_PRICE_ID when it is set', () => {
    const id = resolveEnquiriesPriceId({
      VERCEL_ENV: 'production',
      STRIPE_ENQUIRIES_ANNUAL_PRICE_ID: 'price_live_annual',
    })
    assert.equal(id, 'price_live_annual')
    assert.notEqual(id, SANDBOX)
  })

  it('refuses in production when the env var is missing', () => {
    assert.equal(resolveEnquiriesPriceId({ VERCEL_ENV: 'production' }), null)
    assert.equal(
      resolveEnquiriesPriceId({
        VERCEL_ENV: 'production',
        STRIPE_ENQUIRIES_ANNUAL_PRICE_ID: '   ',
      }),
      null,
    )
  })

  it('uses the sandbox default on Preview when the env var is missing', () => {
    assert.equal(GO_DOTTIE_ENQUIRIES_PRICE_ID, SANDBOX)
    assert.equal(
      resolveEnquiriesPriceId({ VERCEL_ENV: 'preview' }),
      SANDBOX,
    )
    assert.equal(resolveEnquiriesPriceId({ VERCEL_ENV: 'development' }), SANDBOX)
    assert.equal(resolveEnquiriesPriceId({}), SANDBOX)
  })
})

describe('enquiriesProductionPriceRefusal', () => {
  it('refuses a test price in production', () => {
    assert.equal(
      enquiriesProductionPriceRefusal({
        vercelEnv: 'production',
        secretKey: 'sk_live_abc',
        price: { livemode: false, active: true },
      }),
      'test_price',
    )
    assert.equal(
      enquiriesProductionPriceRefusal({
        vercelEnv: 'production',
        secretKey: 'sk_live_abc',
        price: { livemode: true, active: false },
      }),
      'price_inactive',
    )
    assert.equal(
      enquiriesProductionPriceRefusal({
        vercelEnv: 'production',
        secretKey: 'sk_test_abc',
        price: { livemode: true, active: true },
      }),
      'key_not_live',
    )
    assert.equal(
      enquiriesProductionPriceRefusal({
        vercelEnv: 'preview',
        secretKey: 'sk_test_abc',
        price: { livemode: false, active: true },
      }),
      null,
    )
    assert.match(ENQUIRIES_CHECKOUT_UNAVAILABLE, /annual price/)
  })
})
