import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import { upsertGmailAccount } from './tokens.ts'

process.env.BANK_DETAIL_ENCRYPTION_KEY = 'a'.repeat(64)

const OLD = '2024-03-01T00:00:00.000Z'

function fakeSupabase(existing: { email: string; connected_at: string } | null) {
  const upserts: Record<string, unknown>[] = []
  const supabase = {
    from(table: string) {
      if (table !== 'enquiry_gmail_accounts') throw new Error(`unexpected table ${table}`)
      const api = {
        select() { return api },
        eq() { return api },
        upsert(row: Record<string, unknown>) {
          upserts.push(row)
          return api
        },
        async maybeSingle() {
          return { data: existing, error: null }
        },
        async single() {
          const written = upserts.at(-1) ?? {}
          return {
            data: {
              ...written,
              connected_at: written.connected_at ?? existing?.connected_at,
            },
            error: null,
          }
        },
      }
      return api
    },
  }
  return { supabase, upserts }
}

function stubProfile(email: string) {
  const previous = globalThis.fetch
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input)
    if (!url.includes('users/me/profile')) throw new Error(`unexpected fetch ${url}`)
    return new Response(JSON.stringify({ emailAddress: email, historyId: '9' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as typeof fetch
  return () => {
    globalThis.fetch = previous
  }
}

const token = { access_token: 'access-token', refresh_token: 'refresh-token', expires_in: 3600 }

describe('upsertGmailAccount connected_at', () => {
  let restore: (() => void) | undefined
  afterEach(() => {
    restore?.()
    restore = undefined
  })

  it('sets connected_at when there is no previous row', async () => {
    restore = stubProfile('new.parent@gmail.com')
    const { supabase, upserts } = fakeSupabase(null)
    const before = Date.now()
    const saved = await upsertGmailAccount(supabase as never, 'user-1', token)
    const written = upserts[0].connected_at
    assert.equal(typeof written, 'string')
    const stamp = new Date(String(written)).getTime()
    assert.ok(stamp >= before && stamp <= Date.now())
    assert.equal(saved.connected_at, written)
  })

  it('leaves connected_at unchanged when the same address is re-upserted', async () => {
    restore = stubProfile('same.parent@gmail.com')
    const { supabase, upserts } = fakeSupabase({
      email: 'same.parent@gmail.com',
      connected_at: OLD,
    })
    const saved = await upsertGmailAccount(supabase as never, 'user-1', token)
    assert.equal('connected_at' in upserts[0], false)
    assert.equal(saved.connected_at, OLD)
  })

  it('resets connected_at to now when a different address is connected', async () => {
    restore = stubProfile('other.parent@gmail.com')
    const { supabase, upserts } = fakeSupabase({
      email: 'first.parent@gmail.com',
      connected_at: OLD,
    })
    const before = Date.now()
    const saved = await upsertGmailAccount(supabase as never, 'user-1', token)
    const written = upserts[0].connected_at
    assert.notEqual(written, OLD)
    const stamp = new Date(String(written)).getTime()
    assert.ok(stamp >= before && stamp <= Date.now())
    assert.equal(saved.connected_at, written)
  })
})
