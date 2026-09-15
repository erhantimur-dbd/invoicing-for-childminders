import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  await supabase
    .from('enquiry_connections')
    .update({ status: 'revoked', refresh_token_enc: 'revoked', updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('provider', 'google')

  return NextResponse.json({ ok: true })
}
