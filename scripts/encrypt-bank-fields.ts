/**
 * One-shot backfill: encrypt any plaintext bank fields in `bank_accounts`
 * and on the legacy per-child fields in `children`.
 *
 * Idempotent — `encryptField()` skips values that already start with `enc:v1:`.
 *
 * Usage:
 *   tsx scripts/encrypt-bank-fields.ts            # dry run, prints counts
 *   tsx scripts/encrypt-bank-fields.ts --commit   # write changes
 *
 * Env required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   BANK_DETAIL_ENCRYPTION_KEY  (64-char hex)
 */

import { createClient } from '@supabase/supabase-js'
import { encryptField, isEncrypted } from '../src/lib/crypto'

const COMMIT = process.argv.includes('--commit')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env')
  process.exit(1)
}
if (!process.env.BANK_DETAIL_ENCRYPTION_KEY) {
  console.error('Missing BANK_DETAIL_ENCRYPTION_KEY in env')
  process.exit(1)
}

const admin = createClient(url, key, { auth: { persistSession: false } })

async function backfillBankAccounts() {
  const { data, error } = await admin
    .from('bank_accounts')
    .select('id, sort_code, account_number')
  if (error) throw error
  if (!data) return { encrypted: 0, skipped: 0 }

  let encrypted = 0, skipped = 0
  for (const row of data) {
    const sortAlready = isEncrypted(row.sort_code)
    const acctAlready = isEncrypted(row.account_number)
    if (sortAlready && acctAlready) { skipped++; continue }

    const update: Record<string, string | null> = {}
    if (!sortAlready) update.sort_code = encryptField(row.sort_code)
    if (!acctAlready) update.account_number = encryptField(row.account_number)

    if (COMMIT) {
      const { error: upErr } = await admin
        .from('bank_accounts')
        .update(update)
        .eq('id', row.id)
      if (upErr) {
        console.error(`bank_accounts ${row.id}: update failed`, upErr.message)
        continue
      }
    }
    encrypted++
  }
  return { encrypted, skipped }
}

async function backfillChildren() {
  const { data, error } = await admin
    .from('children')
    .select('id, bank_sort_code, bank_account_number')
  if (error) throw error
  if (!data) return { encrypted: 0, skipped: 0 }

  let encrypted = 0, skipped = 0
  for (const row of data) {
    const sortAlready = isEncrypted(row.bank_sort_code)
    const acctAlready = isEncrypted(row.bank_account_number)
    if ((sortAlready && acctAlready) || (!row.bank_sort_code && !row.bank_account_number)) { skipped++; continue }

    const update: Record<string, string | null> = {}
    if (row.bank_sort_code && !sortAlready) update.bank_sort_code = encryptField(row.bank_sort_code)
    if (row.bank_account_number && !acctAlready) update.bank_account_number = encryptField(row.bank_account_number)
    if (Object.keys(update).length === 0) { skipped++; continue }

    if (COMMIT) {
      const { error: upErr } = await admin
        .from('children')
        .update(update)
        .eq('id', row.id)
      if (upErr) {
        console.error(`children ${row.id}: update failed`, upErr.message)
        continue
      }
    }
    encrypted++
  }
  return { encrypted, skipped }
}

async function main() {
  console.log(COMMIT ? 'COMMIT mode — will write changes' : 'DRY RUN — pass --commit to write changes')
  const ba = await backfillBankAccounts()
  console.log(`bank_accounts:  encrypted=${ba.encrypted}  skipped=${ba.skipped}`)
  const ch = await backfillChildren()
  console.log(`children:       encrypted=${ch.encrypted}  skipped=${ch.skipped}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
