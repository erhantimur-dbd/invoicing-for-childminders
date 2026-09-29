import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getXeroConnection, isXeroConfigured } from '@/lib/xero/client'
import { syncToXero } from '@/lib/xero/sync'
import type { AccountingBasis } from '@/lib/xero-export'

export async function POST(request: NextRequest) {
  if (!isXeroConfigured()) {
    return NextResponse.json({ error: 'Xero is not configured on this server' }, { status: 503 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const conn = await getXeroConnection(user.id)
  if (!conn) {
    return NextResponse.json({ error: 'Connect Xero in Settings first' }, { status: 400 })
  }

  let body: { start?: string; end?: string; basis?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const start = body.start
  const end = body.end
  const basis: AccountingBasis = body.basis === 'accrual' ? 'accrual' : 'cash'

  if (!start || !end) {
    return NextResponse.json({ error: 'Missing start/end date' }, { status: 400 })
  }

  try {
    const result = await syncToXero({ userId: user.id, start, end, basis })
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('Xero sync failed', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Sync failed' },
      { status: 500 }
    )
  }
}
