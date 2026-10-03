/**
 * One-off: revoke refresh tokens still stored on enquiry_connections (the
 * dormant Google connect) and delete those rows. Gmail Enquiries no longer
 * has a disconnect route for that table.
 *
 * Dry-run is the default. Nothing is sent to Google and no row is deleted
 * until --apply. Logs counts only — never tokens.
 *
 *   npm run revoke-legacy-google
 *   npm run revoke-legacy-google -- --apply
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BANK_DETAIL_ENCRYPTION_KEY
 */

import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { decryptField } from '../src/lib/crypto'

export const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke'

export type RevokeMode = 'dry-run' | 'apply'

export function revokeMode(argv: string[]): RevokeMode {
  if (argv.includes('--dry-run')) return 'dry-run'
  if (argv.includes('--apply')) return 'apply'
  return 'dry-run'
}

export type RevokeOutcome = 'revoked' | 'already_revoked' | 'failed'

export function classifyRevokeResponse(status: number, errorCode: string | null): RevokeOutcome {
  if (status === 200) return 'revoked'
  if (status === 400 && errorCode === 'invalid_token') return 'already_revoked'
  return 'failed'
}

export function shouldDeleteAfterRevoke(outcome: RevokeOutcome): boolean {
  return outcome === 'revoked' || outcome === 'already_revoked'
}

type Counts = {
  google_rows: number
  revoked: number
  already_revoked: number
  deleted: number
  failed: number
  decrypt_failed: number
  missing_token: number
  mode: RevokeMode
}

async function readErrorCode(response: Response): Promise<string | null> {
  try {
    const json = await response.json() as { error?: unknown }
    return typeof json.error === 'string' ? json.error : null
  } catch {
    return null
  }
}

export async function postRevoke(token: string, fetchImpl: typeof fetch = fetch): Promise<{ status: number; errorCode: string | null }> {
  const response = await fetchImpl(GOOGLE_REVOKE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token }),
  })
  const errorCode = response.ok ? null : await readErrorCode(response)
  return { status: response.status, errorCode }
}

async function main() {
  const mode = revokeMode(process.argv.slice(2))
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  if (mode === 'apply' && !process.env.BANK_DETAIL_ENCRYPTION_KEY) {
    console.error('Missing BANK_DETAIL_ENCRYPTION_KEY')
    process.exit(1)
  }

  const admin = createClient(url, key, { auth: { persistSession: false } })
  const { data, error } = await admin
    .from('enquiry_connections')
    .select('id, refresh_token_enc')
    .eq('provider', 'google')

  if (error) {
    console.error('Could not list legacy Google connections')
    process.exit(1)
  }

  const counts: Counts = {
    google_rows: data?.length ?? 0,
    revoked: 0,
    already_revoked: 0,
    deleted: 0,
    failed: 0,
    decrypt_failed: 0,
    missing_token: 0,
    mode,
  }

  if (mode === 'dry-run') {
    console.log(JSON.stringify(counts))
    return
  }

  for (const row of data ?? []) {
    let token: string | null = null
    try {
      token = decryptField(row.refresh_token_enc)
    } catch {
      counts.decrypt_failed += 1
      continue
    }
    if (!token) {
      counts.missing_token += 1
      continue
    }

    let outcome: RevokeOutcome
    try {
      const result = await postRevoke(token)
      outcome = classifyRevokeResponse(result.status, result.errorCode)
    } catch {
      counts.failed += 1
      continue
    }

    if (outcome === 'failed') {
      counts.failed += 1
      continue
    }
    if (outcome === 'revoked') counts.revoked += 1
    if (outcome === 'already_revoked') counts.already_revoked += 1

    if (shouldDeleteAfterRevoke(outcome)) {
      const { error: deleteError } = await admin.from('enquiry_connections').delete().eq('id', row.id)
      if (deleteError) {
        counts.failed += 1
        continue
      }
      counts.deleted += 1
    }
  }

  console.log(JSON.stringify(counts))
}

const entry = process.argv[1]
const invokedDirectly = Boolean(entry) && import.meta.url === pathToFileURL(resolve(entry)).href
if (invokedDirectly) {
  main().catch(() => {
    console.error('Legacy Google revoke failed')
    process.exit(1)
  })
}
