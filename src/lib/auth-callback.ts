/**
 * Supabase email links fall back to the Site URL (`/?code=…`) when the
 * redirect allowlist rejects `redirectTo`. These helpers forward that
 * request to `/auth/callback` and pick where the session should land.
 */

const RECOVERY_LINK_WINDOW_MS = 24 * 60 * 60 * 1000

export type AuthCallbackUserHint = {
  recovery_sent_at?: string | null
}

/** Absolute URL of `/auth/callback`, or null when `/` should render normally. */
export function homepageAuthCallbackRedirect(requestUrl: string): string | null {
  const url = new URL(requestUrl)
  if (url.pathname !== '/') return null

  const code = url.searchParams.get('code')
  const hasError =
    url.searchParams.has('error') || url.searchParams.has('error_description')
  if (!code && !hasError) return null

  url.pathname = '/auth/callback'
  return url.toString()
}

function isResetPasswordNext(next: string | null): boolean {
  if (!next) return false
  const path = next.split('?')[0].split('#')[0]
  return path === '/reset-password'
}

function isSafeNext(next: string): boolean {
  return next.startsWith('/') && !next.startsWith('//')
}

/** True when a bare Site URL link is still within the recovery-email window. */
function hasRecentRecovery(recoverySentAt: string | null | undefined, now: number): boolean {
  if (!recoverySentAt) return false
  const sentAt = Date.parse(recoverySentAt)
  if (Number.isNaN(sentAt)) return false
  const age = now - sentAt
  return age >= 0 && age <= RECOVERY_LINK_WINDOW_MS
}

/**
 * Where to send the browser after a code exchange.
 * Recovery is explicit (`type=recovery` or `next=/reset-password`). When the
 * Site URL fallback drops both, a recent `recovery_sent_at` is the remaining
 * signal — signup confirmation does not set it.
 */
export function callbackSuccessPath(
  searchParams: URLSearchParams,
  user?: AuthCallbackUserHint | null,
  now = Date.now(),
): string {
  if (searchParams.get('type') === 'recovery' || isResetPasswordNext(searchParams.get('next'))) {
    return '/reset-password'
  }

  const type = searchParams.get('type')
  const next = searchParams.get('next')
  if (!type && !next && hasRecentRecovery(user?.recovery_sent_at, now)) {
    return '/reset-password'
  }

  if (next && isSafeNext(next)) return next
  return '/dashboard'
}

/** Login URL for a failed or error-only callback, preserving Supabase's error. */
export function callbackFailureRedirect(origin: string, searchParams: URLSearchParams): string {
  const url = new URL('/login', origin)
  url.searchParams.set('error', searchParams.get('error') || 'auth_callback_failed')
  const description = searchParams.get('error_description')
  if (description) url.searchParams.set('error_description', description)
  return url.toString()
}
