import assert from 'node:assert/strict'
import { test } from 'node:test'
import { resolveSubscriptionTier, tierForInvoicingPriceId } from './prices.ts'

test('configured invoicing price ids map to the child-cap tier', () => {
  const previous = {
    starterMonthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
    starterAnnual: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID,
    professionalMonthly: process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID,
    professionalAnnual: process.env.STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID,
  }
  process.env.STRIPE_STARTER_MONTHLY_PRICE_ID = 'price_starter_month'
  process.env.STRIPE_STARTER_ANNUAL_PRICE_ID = 'price_starter_year'
  process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID = 'price_pro_month'
  process.env.STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID = 'price_pro_year'

  try {
    assert.equal(tierForInvoicingPriceId('price_starter_month'), 'starter')
    assert.equal(tierForInvoicingPriceId('price_starter_year'), 'starter')
    assert.equal(tierForInvoicingPriceId('price_pro_month'), 'professional')
    assert.equal(tierForInvoicingPriceId('price_pro_year'), 'professional')
    assert.equal(tierForInvoicingPriceId('price_unknown'), null)
    assert.equal(resolveSubscriptionTier('starter', 'price_pro_month'), 'professional')
    assert.equal(resolveSubscriptionTier('professional', null), 'professional')
    assert.equal(resolveSubscriptionTier('enterprise', null), null)
  } finally {
    for (const [key, value] of Object.entries({
      STRIPE_STARTER_MONTHLY_PRICE_ID: previous.starterMonthly,
      STRIPE_STARTER_ANNUAL_PRICE_ID: previous.starterAnnual,
      STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID: previous.professionalMonthly,
      STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID: previous.professionalAnnual,
    })) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
})
