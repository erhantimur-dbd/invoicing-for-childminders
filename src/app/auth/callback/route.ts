import { createClient } from '@/lib/supabase/server'
import { callbackFailureRedirect, callbackSuccessPath } from '@/lib/auth-callback'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const path = callbackSuccessPath(searchParams, data.user ?? data.session?.user)
      return NextResponse.redirect(`${origin}${path}`)
    }
  }

  return NextResponse.redirect(callbackFailureRedirect(origin, searchParams))
}
