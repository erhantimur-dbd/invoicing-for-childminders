import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getXeroConnection, isXeroConfigured } from '@/lib/xero/client'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  if (!isXeroConfigured()) {
    return NextResponse.json({
      configured: false,
      connected: false,
      tenantName: null,
      connectedAt: null,
    })
  }

  try {
    const conn = await getXeroConnection(user.id)
    return NextResponse.json({
      configured: true,
      connected: Boolean(conn),
      tenantName: conn?.tenant_name ?? null,
      connectedAt: conn?.connected_at ?? null,
      expiresAt: conn?.expires_at ?? null,
    })
  } catch (err) {
    console.error('Xero status failed', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Status failed' },
      { status: 500 }
    )
  }
}
