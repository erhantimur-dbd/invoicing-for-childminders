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
  '/reset-password',
  '/support',
  '/pricing',
  '/privacy',
  '/terms',
  '/faq',
  '/sitemap.xml',
  '/robots.txt',
]

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true
  // Stripe webhook — signature-verified at the route
  if (pathname.startsWith('/api/stripe/webhook')) return true
  // Vercel cron — bearer-token-verified at the route
  if (pathname.startsWith('/api/cron/')) return true
  // Sitemap proxy
  if (pathname.startsWith('/api/sitemap')) return true
  // Public invoice view (DOB-gated for parents)
  if (pathname.startsWith('/invoice/')) return true
  if (pathname.startsWith('/api/invoice/')) return true
  // OAuth/email callback flows
  if (pathname.startsWith('/auth/')) return true
  // Public marketing content
  if (pathname === '/guides' || pathname.startsWith('/guides/')) return true
  return false
}

// App areas that require authentication. Anything outside these prefixes is
// either explicitly public or simply doesn't exist — so unknown URLs fall
// through to Next's 404 instead of being redirected to /login (a soft-404 that
// confuses crawlers and users). Protected layouts also self-guard, so this
// list is defence-in-depth rather than the only gate.
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/children',
  '/invoices',
  '/expenses',
  '/reports',
  '/profile',
  '/onboarding',
  '/admin',
  '/subscribe',
]

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )
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
    // API routes get a 401 so client fetches can handle it.
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }
    // Known app areas redirect to login; everything else (unknown URLs,
    // static files like /manifest.json or /.well-known/*) falls through so
    // Next can serve the file or render a real 404.
    if (isProtectedRoute(pathname)) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
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

  // ── 4. Subscription check for protected app routes ───────────────────────
  // Scoped to known protected routes so unknown URLs render a 404 for logged-in
  // users too, rather than bouncing them to /subscribe.
  if (isProtectedRoute(pathname) && !isSubscriptionExempt(pathname)) {
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
