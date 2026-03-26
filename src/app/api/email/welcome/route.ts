import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email/resend'
import { welcomeEmail } from '@/lib/email/templates'

export async function POST(request: NextRequest) {
  // ── Auth: accept either a valid session cookie OR a shared internal secret ──
  const internalSecret = request.headers.get('x-internal-secret')
  const secretMatches =
    internalSecret &&
    process.env.INTERNAL_SECRET &&
    internalSecret === process.env.INTERNAL_SECRET

  let userId: string | undefined

  if (secretMatches) {
    // Caller supplied a valid internal secret — trust the userId from the body
    const body = await request.json()
    userId = body?.userId
  } else {
    // Fall back to verifying the user's own session
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const requestedId: string | undefined = body?.userId

    // A user may only trigger a welcome email for themselves
    if (requestedId && requestedId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    userId = user.id
  }

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  }

  // ── Fetch the user profile ────────────────────────────────────────────────
  // Prefer service-role client so this works even when called server-side
  // immediately after signup (before the cookie is propagated).
  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  let name: string | undefined
  let email: string | undefined

  if (serviceKey) {
    const serviceSupabase = createServiceClient(serviceUrl, serviceKey)
    const { data: profile } = await serviceSupabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .single()

    name = profile?.full_name
    email = profile?.email

    // If no profile row yet, fall back to auth.users
    if (!email) {
      const {
        data: { user: authUser },
      } = await serviceSupabase.auth.admin.getUserById(userId)
      email = authUser?.email
      if (!name) {
        name = authUser?.user_metadata?.full_name
      }
    }
  } else {
    // No service key — use the regular server client (user must be authenticated)
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .single()

    name = profile?.full_name
    email = profile?.email
  }

  if (!email) {
    return NextResponse.json({ error: 'Could not resolve user email' }, { status: 500 })
  }

  // ── Send the welcome email ────────────────────────────────────────────────
  const { subject, html } = welcomeEmail({ name: name ?? email })

  const result = await sendEmail({ to: email, subject, html })

  if (!result.success) {
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
