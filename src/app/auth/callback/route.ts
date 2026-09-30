import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { safeNext } from '@/lib/auth/safe-next'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

async function sendWelcomeIfNeeded(userId: string) {
  try {
    const origin = process.env.NEXT_PUBLIC_APP_URL
    const secret = process.env.INTERNAL_SECRET
    if (!origin || !secret) {
      // Fall back to direct in-process send via the welcome route logic is not
      // available without a secret — skip rather than failing the auth hop.
      return
    }
    await fetch(`${origin.replace(/\/$/, '')}/api/email/welcome`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': secret,
      },
      body: JSON.stringify({ userId }),
    })
  } catch (err) {
    console.error('auth callback welcome email failed:', err)
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNext(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // Password recovery always lands on the reset page.
      if (next.startsWith('/reset-password')) {
        return NextResponse.redirect(`${origin}${next}`)
      }

      let destination = next

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .maybeSingle()

        const isNewUser = !profile?.onboarding_completed

        // New OAuth users skip /signup, so send them through onboarding once.
        if (isNewUser && next === '/dashboard') {
          destination = '/onboarding'
        }

        // Ensure a trial row exists even if the DB trigger raced or was missing.
        // Only for new users — never re-grant a trial to returning accounts.
        if (isNewUser) {
          const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
          if (serviceKey) {
            const admin = createServiceClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              serviceKey,
              { auth: { persistSession: false } }
            )
            await admin.from('subscriptions').upsert(
              {
                user_id: user.id,
                status: 'trialing',
                trial_end: new Date(Date.now() + 7 * 86_400_000).toISOString(),
                tier: 'starter',
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id', ignoreDuplicates: true }
            )
          }

          // Welcome once for OAuth / confirmed-email hops (not returning logins).
          void sendWelcomeIfNeeded(user.id)
        }
      }

      return NextResponse.redirect(`${origin}${destination}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
