import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require no authentication
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/auth/callback',
  '/forgot-password',
  '/support',
  '/pricing',
]

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true
  if (pathname.startsWith('/api/stripe/webhook')) return true
  // Static assets and auth callback sub-paths
  if (pathname.startsWith('/auth/')) return true
  return false
}

// Routes exempt from subscription check (even when authenticated)
function isSubscriptionExempt(pathname: string): boolean {
  if (pathname.startsWith('/subscribe')) return true
  if (pathname.startsWith('/onboarding')) return true
  if (pathname.startsWith('/admin')) return true
  if (pathname.startsWith('/api')) return true
  return false
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // ── 1. Unauthenticated access ─────────────────────────────────────────────
  if (!user) {
    if (isPublicRoute(pathname)) {
      return supabaseResponse
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // ── 2. Authenticated — root redirect ─────────────────────────────────────
  if (pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // ── 3. Admin route guard ──────────────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  }

  // ── 4. Subscription check for all other protected routes ─────────────────
  if (!isSubscriptionExempt(pathname)) {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status, trial_end')
      .eq('user_id', user.id)
      .maybeSingle()

    const isActive = subscription?.status === 'active'
    const isValidTrial =
      subscription?.status === 'trialing' &&
      subscription.trial_end != null &&
      new Date(subscription.trial_end) > new Date()

    if (!isActive && !isValidTrial) {
      const url = request.nextUrl.clone()
      url.pathname = '/subscribe'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
