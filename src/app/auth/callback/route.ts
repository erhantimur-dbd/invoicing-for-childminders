import { createClient } from '@/lib/supabase/server'
import { destinationAfterAuth } from '@/lib/enquiries/access'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Only allow same-origin redirects starting with a single "/", and reject
 * "//", "/\", or anything that could escape to another host.
 */
function safeNext(raw: string | null): string {
  if (!raw) return '/dashboard'
  if (!raw.startsWith('/')) return '/dashboard'
  if (raw.startsWith('//') || raw.startsWith('/\\')) return '/dashboard'
  return raw
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNext(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      let destination = next
      const path = next.split('?')[0] ?? next
      if (path === '/dashboard' || path === '/onboarding') {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          const { data: sub, error: subError } = await supabase
            .from('subscriptions')
            .select('status, trial_end, enquiries_status')
            .eq('user_id', user.id)
            .maybeSingle()
          if (!subError) destination = destinationAfterAuth(next, sub)
        }
      }
      return NextResponse.redirect(`${origin}${destination}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
