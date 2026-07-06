/**
 * Bank-account CRUD with server-side encryption.
 *
 * Why this route exists: bank account details must be encrypted at rest, and
 * the key must never be sent to the browser. So writes go through here, the
 * server encrypts before insert/update, and reads return masked summaries
 * by default (full plaintext only via /[id]/full when explicitly requested).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encryptField, decryptField, maskAccountNumber, maskSortCode } from '@/lib/crypto'
import { log } from '@/lib/log'
import { z } from 'zod'

const BankAccountInput = z.object({
  nickname: z.string().max(40).optional().default(''),
  bank_name: z.string().max(80).optional().default(''),
  account_name: z.string().min(1).max(120),
  sort_code: z.string().min(1).max(16),
  account_number: z.string().min(4).max(16),
})

type AccountRow = {
  id: string
  childminder_id: string
  nickname: string
  bank_name: string
  account_name: string
  sort_code: string
  account_number: string
  created_at: string
  updated_at: string
}

function summarise(row: AccountRow) {
  // Decrypt only enough to render the masked UI.
  const accountNumber = decryptField(row.account_number) ?? ''
  const sortCode = decryptField(row.sort_code) ?? ''
  return {
    id: row.id,
    nickname: row.nickname,
    bank_name: row.bank_name,
    account_name: row.account_name,
    // Masked-only views — the client never gets the full digits via this route.
    sort_code_masked: maskSortCode(sortCode),
    account_number_masked: maskAccountNumber(accountNumber),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data, error } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('childminder_id', user.id)
    .order('created_at')

  if (error) {
    log.error('bank_accounts_list_failed', error, { user_id: user.id })
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 })
  }

  return NextResponse.json({ accounts: (data || []).map(summarise) })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = BankAccountInput.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('bank_accounts')
    .insert({
      childminder_id: user.id,
      nickname: parsed.data.nickname,
      bank_name: parsed.data.bank_name,
      account_name: parsed.data.account_name,
      sort_code: encryptField(parsed.data.sort_code),
      account_number: encryptField(parsed.data.account_number),
      created_at: now,
      updated_at: now,
    })
    .select()
    .single()

  if (error || !data) {
    log.error('bank_account_create_failed', error, { user_id: user.id })
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  return NextResponse.json({ account: summarise(data) })
}
