import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'
import { createServerClient } from '@supabase/ssr'
import { getSupabasePublicEnv } from './env.ts'

const emptyCookies = {
  getAll: () => [],
  setAll: () => {},
}

describe('getSupabasePublicEnv', () => {
  it('returns null when Preview has no public Supabase URL or key', () => {
    const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const prevKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    try {
      assert.equal(getSupabasePublicEnv(), null)
    } finally {
      if (prevUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
      else process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl
      if (prevKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevKey
    }
  })

  it('returns url and anonKey when both are set', () => {
    const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const prevKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
    try {
      assert.deepEqual(getSupabasePublicEnv(), {
        url: 'https://example.supabase.co',
        anonKey: 'anon-key',
      })
    } finally {
      if (prevUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
      else process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl
      if (prevKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevKey
    }
  })
})

describe('createServerClient without public env', () => {
  it('throws the Preview homepage 500', () => {
    assert.throws(
      () => createServerClient(undefined as unknown as string, undefined as unknown as string, { cookies: emptyCookies }),
      /URL and Key are required to create a Supabase client/,
    )
  })
})

describe('browser createClient stays Preview-safe', () => {
  it('does not construct a client with empty public env', () => {
    const client = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'client.ts'),
      'utf8',
    )
    assert.match(client, /getSupabasePublicEnv/)
    assert.match(client, /Supabase is not configured/)
  })
})

describe('public homepage stays Preview-safe on navy chrome', () => {
  it('does not construct a Supabase client on /', () => {
    const home = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '../../app/page.tsx'),
      'utf8',
    )
    assert.doesNotMatch(home, /createClient/)
    assert.doesNotMatch(home, /getUser/)
    assert.match(home, /marketing\.headline/)
    assert.match(home, /marketing\.hero/)
  })
})
