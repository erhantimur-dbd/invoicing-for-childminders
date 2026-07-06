import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encryptField, decryptField, maskAccountNumber, maskSortCode } from '@/lib/crypto'
import { log } from '@/lib/log'
import { z } from 'zod'

const PatchInput = z.object({
  nickname: z.string().max(40).optional(),
  bank_name: z.string().max(80).optional(),
  account_name: z.string().min(1).max(120).optional(),
  sort_code: z.string().min(1).max(16).optional(),
  account_number: z.string().min(4).max(16).optional(),
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
  const accountNumber = decryptField(row.account_number) ?? ''
  const sortCode = decryptField(row.sort_code) ?? ''
  return {
    id: row.id,
    nickname: row.nickname,
    bank_name: row.bank_name,
    account_name: row.account_name,
    sort_code_masked: maskSortCode(sortCode),
    account_number_masked: maskAccountNumber(accountNumber),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const parsed = PatchInput.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })

  // Build update payload — only encrypt fields actually present in the patch.
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (parsed.data.nickname !== undefined) update.nickname = parsed.data.nickname
  if (parsed.data.bank_name !== undefined) update.bank_name = parsed.data.bank_name
  if (parsed.data.account_name !== undefined) update.account_name = parsed.data.account_name
  if (parsed.data.sort_code !== undefined) update.sort_code = encryptField(parsed.data.sort_code)
  if (parsed.data.account_number !== undefined) update.account_number = encryptField(parsed.data.account_number)

  const { data, error } = await supabase
    .from('bank_accounts')
    .update(update)
    .eq('id', id)
    .eq('childminder_id', user.id)
    .select()
    .single()

  if (error || !data) {
    log.error('bank_account_update_failed', error, { user_id: user.id, account_id: id })
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  return NextResponse.json({ account: summarise(data) })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { error } = await supabase
    .from('bank_accounts')
    .delete()
    .eq('id', id)
    .eq('childminder_id', user.id)

  if (error) {
    log.error('bank_account_delete_failed', error, { user_id: user.id, account_id: id })
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
