import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

/**
 * Grant a manual trial to a qualified client.
 *
 * Trials are no longer auto-granted on signup (see 20260706_disable_auto_trial).
 * An admin uses this route to enable a trial for a specific account after a
 * demo / qualification conversation. Sets subscriptions.status = 'trialing'
 * with trial_end = now() + N days, which the proxy treats as valid access.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // Admin only.
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { email?: string; days?: number }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const email = (body.email || '').trim().toLowerCase()
  const days = Number.isFinite(body.days) ? Math.floor(body.days as number) : 14
  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  if (days < 1 || days > 90) return NextResponse.json({ error: 'Days must be between 1 and 90' }, { status: 400 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Service role not configured' }, { status: 500 })

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { persistSession: false },
  })

  // Resolve the target user by email via profiles.
  const { data: target } = await admin
    .from('profiles').select('id, full_name, email').ilike('email', email).maybeSingle()
  if (!target) {
    return NextResponse.json({ error: 'No account found with that email' }, { status: 404 })
  }

  const trialEnd = new Date()
  trialEnd.setDate(trialEnd.getDate() + days)
  const now = new Date().toISOString()

  const { error } = await admin
    .from('subscriptions')
    .upsert(
      {
        user_id: target.id,
        status: 'trialing',
        trial_end: trialEnd.toISOString(),
        updated_at: now,
      },
      { onConflict: 'user_id' }
    )

  if (error) {
    return NextResponse.json({ error: `Failed to grant trial: ${error.message}` }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    email: target.email,
    name: target.full_name,
    trial_end: trialEnd.toISOString(),
    days,
  })
}
