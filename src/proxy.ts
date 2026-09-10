import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSupabasePublicEnv } from '@/lib/supabase/env'

// Routes that require no authentication
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/auth/callback',
  '/forgot-password',
  '/reset-password',
  '/support',
  '/demo',
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
  '/enquiries',
]

const INVOICING_PREFIXES = ['/children', '/invoices', '/expenses', '/reports', '/onboarding']

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
  // Paywall + setup live on these routes; the pages check entitlements.
  if (pathname.startsWith('/enquiries')) return true
  return false
}

function needsInvoicing(pathname: string): boolean {
  return INVOICING_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public marketing pages (including `/` and `/privacy`) must not touch Supabase.
  // Preview has crashed with 500 both when env is missing *and* when it is
  // present but createServerClient / getUser throws.
  if (isPublicRoute(pathname)) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })
  const supabaseEnv = getSupabasePublicEnv()
  if (!supabaseEnv) {
    if (isProtectedRoute(pathname)) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.search = ''
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  try {
  const supabase = createServerClient(
    supabaseEnv.url,
    supabaseEnv.anonKey,
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
      url.search = ''
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
      .select('status, trial_end, enquiries_status')
      .eq('user_id', user.id)
      .maybeSingle()

    const invoicingOk =
      subscription?.status === 'active' ||
      (subscription?.status === 'trialing' &&
        subscription.trial_end != null &&
        new Date(subscription.trial_end) > new Date())
    const enquiriesOk = subscription?.enquiries_status === 'active'

    if (needsInvoicing(pathname)) {
      if (!invoicingOk) {
        const url = request.nextUrl.clone()
        url.pathname = '/subscribe'
        url.search = '?product=invoicing'
        return NextResponse.redirect(url)
      }
    } else if (!invoicingOk && !enquiriesOk) {
      const url = request.nextUrl.clone()
      url.pathname = '/subscribe'
      url.search = '?product=enquiries'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
  } catch {
    return NextResponse.next({ request })
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
