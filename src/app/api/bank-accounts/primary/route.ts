/**
 * Returns the authed childminder's primary bank account, decrypted.
 *
 * Distinct from `/api/bank-accounts` (which returns masked summaries) — this
 * endpoint returns the full plaintext so the dashboard's invoice preview
 * can render the bank-transfer block. The user is viewing their own data;
 * RLS + the user check below ensure no one else gets it.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decryptField } from '@/lib/crypto'
import { log } from '@/lib/log'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('primary_bank_account_id')
    .eq('id', user.id)
    .single()

  if (!profile?.primary_bank_account_id) {
    return NextResponse.json({ account: null })
  }

  const { data: row, error } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('id', profile.primary_bank_account_id)
    .eq('childminder_id', user.id)
    .single()

  if (error || !row) {
    log.error('primary_bank_account_fetch_failed', error, { user_id: user.id })
    return NextResponse.json({ account: null })
  }

  return NextResponse.json({
    account: {
      id: row.id,
      nickname: row.nickname,
      bank_name: row.bank_name,
      account_name: row.account_name,
      sort_code: decryptField(row.sort_code),
      account_number: decryptField(row.account_number),
    },
  })
}
