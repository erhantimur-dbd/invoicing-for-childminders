import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const read = (name: string) => readFileSync(join(root, 'supabase/migrations', name), 'utf8')

describe('enquiry send_mode migrations', () => {
  const gmail = read('20260909000000_enquiry_gmail.sql')
  const backfill = read('20260910000001_enquiry_send_mode.sql')
  const def = read('20260911000000_enquiry_send_mode_default_auto.sql')

  it('does not stamp existing rows with default auto', () => {
    assert.match(backfill, /add column if not exists send_mode text\s*;/)
    assert.doesNotMatch(backfill, /send_mode text not null default 'auto'/)
    assert.match(backfill, /when auto_send_replies is true then 'auto'/)
    assert.match(backfill, /else 'approve'/)
    assert.match(backfill, /where send_mode is null/)
  })

  it('keeps an explicit choice and the later auto default on re-run', () => {
    assert.match(backfill, /current_default not like '%''auto''%'/)
    assert.match(backfill, /set default 'approve'/)
    assert.match(backfill, /if not exists/)
    assert.match(def, /set default 'auto'/)
    assert.doesNotMatch(def, /update public\.enquiry_settings/i)
  })

  it('adds connected_at with a now() backfill when the table already exists', () => {
    assert.match(gmail, /connected_at timestamptz not null default now\(\)/)
    assert.match(gmail, /add column if not exists connected_at timestamptz/)
    assert.match(gmail, /set connected_at = now\(\)/)
    assert.match(gmail, /where connected_at is null/)
  })
})
