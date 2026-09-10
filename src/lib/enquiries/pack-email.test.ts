import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { packFilePublicUrl } from './pack-email.ts'

describe('packFilePublicUrl', () => {
  it('returns absolute URLs unchanged', () => {
    assert.equal(
      packFilePublicUrl('https://cdn.example/pack.pdf'),
      'https://cdn.example/pack.pdf',
    )
  })

  it('returns null when path is empty or env is missing', () => {
    const prev = process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    try {
      assert.equal(packFilePublicUrl(''), null)
      assert.equal(packFilePublicUrl(null), null)
      assert.equal(packFilePublicUrl('policies/welcome.pdf'), null)
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
      else process.env.NEXT_PUBLIC_SUPABASE_URL = prev
    }
  })

  it('builds a public storage URL from bucket/object or a bare object name', () => {
    const prev = process.env.NEXT_PUBLIC_SUPABASE_URL
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co/'
    try {
      assert.equal(
        packFilePublicUrl('starter-packs/urn-123/welcome.pdf'),
        'https://example.supabase.co/storage/v1/object/public/starter-packs/urn-123/welcome.pdf',
      )
      assert.equal(
        packFilePublicUrl('welcome.pdf'),
        'https://example.supabase.co/storage/v1/object/public/enquiry-knowledge/welcome.pdf',
      )
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
      else process.env.NEXT_PUBLIC_SUPABASE_URL = prev
    }
  })
})
