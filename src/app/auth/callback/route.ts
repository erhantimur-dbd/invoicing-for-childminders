import { createClient } from '@/lib/supabase/server'
import { safeNext } from '@/lib/auth/safe-next'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

async function sendWelcomeIfNeeded(userId: string) {
  try {
    const origin = process.env.NEXT_PUBLIC_APP_URL
    const secret = process.env.INTERNAL_SECRET
    if (!origin || !secret) return
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

        // No free trial — new OAuth users pick a plan (or book a demo from marketing).
        if (isNewUser && (next === '/dashboard' || next === '/onboarding')) {
          destination = '/subscribe'
        }

        if (isNewUser) {
          void sendWelcomeIfNeeded(user.id)
        }
      }

      return NextResponse.redirect(`${origin}${destination}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
