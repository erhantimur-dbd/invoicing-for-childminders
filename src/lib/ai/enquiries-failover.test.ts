import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  enquiriesAnthropicFailoverEnabled,
  enquiriesFailoverBlockReason,
  isProductionDeploy,
} from './enquiries-failover.ts'

describe('isProductionDeploy', () => {
  it('is true only for VERCEL_ENV=production', () => {
    assert.equal(isProductionDeploy({ VERCEL_ENV: 'production' }), true)
    assert.equal(isProductionDeploy({ VERCEL_ENV: 'preview' }), false)
    assert.equal(isProductionDeploy({ VERCEL_ENV: 'development' }), false)
    assert.equal(isProductionDeploy({}), false)
  })
})

describe('enquiriesAnthropicFailoverEnabled', () => {
  it('is on in production without the Preview flag (Privacy Soft CTA live)', () => {
    assert.equal(
      enquiriesAnthropicFailoverEnabled({
        VERCEL_ENV: 'production',
      }),
      true,
    )
    assert.equal(
      enquiriesAnthropicFailoverEnabled({
        VERCEL_ENV: 'production',
        ENQUIRIES_ANTHROPIC_FAILOVER: 'false',
      }),
      true,
    )
    assert.equal(
      enquiriesFailoverBlockReason({
        VERCEL_ENV: 'production',
      }),
      null,
    )
  })

  it('is off in Preview/local unless the flag is exactly true', () => {
    assert.equal(
      enquiriesAnthropicFailoverEnabled({ VERCEL_ENV: 'preview' }),
      false,
    )
    assert.equal(
      enquiriesAnthropicFailoverEnabled({
        VERCEL_ENV: 'preview',
        ENQUIRIES_ANTHROPIC_FAILOVER: 'false',
      }),
      false,
    )
    assert.equal(
      enquiriesFailoverBlockReason({ VERCEL_ENV: 'preview' }),
      'flag_off',
    )
  })

  it('is on in Preview/local when ENQUIRIES_ANTHROPIC_FAILOVER=true', () => {
    assert.equal(
      enquiriesAnthropicFailoverEnabled({
        VERCEL_ENV: 'preview',
        ENQUIRIES_ANTHROPIC_FAILOVER: 'true',
      }),
      true,
    )
    assert.equal(
      enquiriesAnthropicFailoverEnabled({
        ENQUIRIES_ANTHROPIC_FAILOVER: 'true',
      }),
      true,
    )
    assert.equal(
      enquiriesFailoverBlockReason({
        VERCEL_ENV: 'preview',
        ENQUIRIES_ANTHROPIC_FAILOVER: 'true',
      }),
      null,
    )
  })
})
