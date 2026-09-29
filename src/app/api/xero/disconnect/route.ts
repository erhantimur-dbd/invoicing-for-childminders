import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deleteXeroConnection } from '@/lib/xero/client'

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    await deleteXeroConnection(user.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Xero disconnect failed', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Disconnect failed' },
      { status: 500 }
    )
  }
}
