/**
 * One-shot backfill: encrypt plaintext bank fields on three tables.
 *
 *   bank_accounts  sort_code, account_number
 *   children       bank_sort_code, bank_account_number
 *   profiles       default_bank_sort_code, default_bank_account_number
 *
 * profiles and children are held until the ChildForm, onboarding and
 * saved-bank picker paths move behind server routes. With no --tables
 * flag, only bank_accounts runs.
 *
 * Idempotent. Values that already start with enc:v1: are left unchanged.
 * Null and empty values are skipped. Only columns that still need
 * encryption are updated. A row is written only when every plaintext
 * value round-trips: decryptField(encryptField(v)) === v. If any value
 * fails, that row is left untouched.
 *
 * Dry run is the default. --commit writes. Output is per-table counts
 * only (encrypted, skipped, failed). Values are never printed. A row id
 * is printed only when an update itself fails.
 *
 * Usage:
 *   node --experimental-strip-types --import ./src/lib/register-test-hooks.mjs scripts/encrypt-bank-fields.ts
 *   node --experimental-strip-types --import ./src/lib/register-test-hooks.mjs scripts/encrypt-bank-fields.ts --commit
 *   node --experimental-strip-types --import ./src/lib/register-test-hooks.mjs scripts/encrypt-bank-fields.ts --tables=bank_accounts,profiles,children --commit
 *
 * Env required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   BANK_DETAIL_ENCRYPTION_KEY  (64-char hex)
 */

import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { decryptField, encryptField } from '../src/lib/crypto'

export const BANK_TABLES = ['bank_accounts', 'children', 'profiles'] as const

export type BankTable = (typeof BANK_TABLES)[number]

export const TABLE_COLUMNS: Record<BankTable, readonly string[]> = {
  bank_accounts: ['sort_code', 'account_number'],
  children: ['bank_sort_code', 'bank_account_number'],
  profiles: ['default_bank_sort_code', 'default_bank_account_number'],
}

export type BankField = string | null | undefined

export type BankCrypto = {
  encrypt: (value: string) => string | null
  decrypt: (value: string | null | undefined) => string | null
}

export type BankRowPlan =
  | { outcome: 'skip' }
  | { outcome: 'failed' }
  | { outcome: 'encrypt'; update: Record<string, string> }

const realCrypto: BankCrypto = {
  encrypt: encryptField,
  decrypt: decryptField,
}

export function planBankRow(
  fields: Record<string, BankField>,
  crypto: BankCrypto = realCrypto,
): BankRowPlan {
  const update: Record<string, string> = {}
  for (const [column, value] of Object.entries(fields)) {
    if (value == null || value === '') continue
    if (value.startsWith('enc:v1:')) continue
    const encrypted = crypto.encrypt(value)
    if (typeof encrypted !== 'string' || crypto.decrypt(encrypted) !== value) {
      return { outcome: 'failed' }
    }
    update[column] = encrypted
  }
  if (Object.keys(update).length === 0) return { outcome: 'skip' }
  return { outcome: 'encrypt', update }
}

export function parseTableScope(argv: string[]): { tables: BankTable[]; error?: string } {
  const flag = argv.find((arg) => arg.startsWith('--tables='))
  if (!flag) return { tables: ['bank_accounts'] }
  const names = flag.slice('--tables='.length).split(',').map((name) => name.trim()).filter(Boolean)
  const unknown = names.filter((name) => !(BANK_TABLES as readonly string[]).includes(name))
  if (names.length === 0 || unknown.length > 0) {
    const which = unknown.length > 0 ? unknown.join(', ') : '(empty)'
    return { tables: [], error: `Unknown table: ${which}` }
  }
  const tables: BankTable[] = []
  for (const name of names) {
    const table = name as BankTable
    if (!tables.includes(table)) tables.push(table)
  }
  return { tables }
}

export type BackfillCounts = { encrypted: number; skipped: number; failed: number }

type BankRow = { id: string } & Record<string, string | null>

export async function backfillTable(
  admin: SupabaseClient,
  table: BankTable,
  commit: boolean,
): Promise<BackfillCounts> {
  const columns = TABLE_COLUMNS[table]
  const { data, error } = await admin
    .from(table)
    .select(['id', ...columns].join(', '))
  if (error) throw error

  const counts: BackfillCounts = { encrypted: 0, skipped: 0, failed: 0 }
  for (const row of (data ?? []) as unknown as BankRow[]) {
    const fields: Record<string, BankField> = {}
    for (const column of columns) fields[column] = row[column]
    const plan = planBankRow(fields)
    if (plan.outcome === 'skip') {
      counts.skipped += 1
      continue
    }
    if (plan.outcome === 'failed') {
      counts.failed += 1
      continue
    }
    if (commit) {
      const { error: updateError } = await admin.from(table).update(plan.update).eq('id', row.id)
      if (updateError) {
        console.error(`${table} ${row.id}: update failed`)
        counts.failed += 1
        continue
      }
    }
    counts.encrypted += 1
  }
  return counts
}

export async function backfillProfiles(admin: SupabaseClient, commit: boolean): Promise<BackfillCounts> {
  return backfillTable(admin, 'profiles', commit)
}

async function main() {
  const scope = parseTableScope(process.argv)
  if (scope.error) {
    console.error(scope.error)
    process.exit(1)
  }

  console.log(`tables: ${scope.tables.join(', ')}`)
  const commit = process.argv.includes('--commit')
  console.log(commit ? 'COMMIT mode — will write changes' : 'DRY RUN — pass --commit to write changes')

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
  for (const table of scope.tables) {
    const counts = table === 'profiles'
      ? await backfillProfiles(admin, commit)
      : await backfillTable(admin, table, commit)
    console.log(`${table}: encrypted=${counts.encrypted} skipped=${counts.skipped} failed=${counts.failed}`)
  }
}

const entry = process.argv[1]
const invokedDirectly = Boolean(entry) && import.meta.url === pathToFileURL(resolve(entry)).href
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : 'Bank field backfill failed')
    process.exit(1)
  })
}
