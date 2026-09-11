/**
 * Portal Google/Apple login (Supabase Auth), not Soft Launch Gmail Connect.
 *
 * Soft Launch Preview callback Erhan must allowlist in Supabase
 * Authentication → URL Configuration → Redirect URLs:
 *   https://invoicing-for-childminders-git-cur-cfb18c-erhan-timurs-projects.vercel.app/auth/callback
 * Optional wildcard for other Vercel Previews:
 *   https://*.vercel.app/auth/callback
 * Site URL can stay https://www.godottie.cloud — do not point NEXT_PUBLIC_APP_URL
 * at Production for this hop; the client uses window.location.origin.
 *
 * Google Cloud redirect for this provider is Supabase's
 *   https://<project-ref>.supabase.co/auth/v1/callback
 * (already required for production Google login).
 */

export const PORTAL_OAUTH_CALLBACK_PATH = '/auth/callback'
export const SOCIAL_AUTH_START_TIMEOUT_MS = 8_000
export const SOCIAL_AUTH_REDIRECT_GRACE_MS = 2_500

export const SOFT_LAUNCH_PREVIEW_ORIGIN =
  'https://invoicing-for-childminders-git-cur-cfb18c-erhan-timurs-projects.vercel.app'

export function portalOAuthRedirectTo(origin: string): string {
  return `${origin.replace(/\/$/, '')}${PORTAL_OAUTH_CALLBACK_PATH}`
}

export type SocialProvider = 'google' | 'apple'

export type SocialAuthStartResult =
  | { ok: true; url: string }
  | { ok: false; message: string }

export type SocialAuthSignIn = (args: {
  provider: SocialProvider
  redirectTo: string
}) => Promise<{
  data: { url?: string | null }
  error: { message: string } | null
}>

const PROVIDER_LABEL: Record<SocialProvider, string> = {
  google: 'Google',
  apple: 'Apple',
}

export function socialAuthMissingEnvMessage(provider: SocialProvider): string {
  return `${PROVIDER_LABEL[provider]} sign-in is not configured on this Preview. Use email and password.`
}

export function socialAuthTimeoutMessage(provider: SocialProvider): string {
  return `${PROVIDER_LABEL[provider]} sign-in did not start. Check your connection and try again.`
}

export function socialAuthRedirectBlockedMessage(provider: SocialProvider): string {
  return `Could not open ${PROVIDER_LABEL[provider]} sign-in. Add this Preview’s /auth/callback URL in Supabase Auth redirect URLs.`
}

export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

export async function startSocialAuth(params: {
  provider: SocialProvider
  origin: string
  hasPublicEnv: boolean
  signIn: SocialAuthSignIn
  timeoutMs?: number
}): Promise<SocialAuthStartResult> {
  const { provider, origin, hasPublicEnv, signIn } = params
  const timeoutMs = params.timeoutMs ?? SOCIAL_AUTH_START_TIMEOUT_MS

  if (!hasPublicEnv) {
    return { ok: false, message: socialAuthMissingEnvMessage(provider) }
  }

  try {
    const redirectTo = portalOAuthRedirectTo(origin)
    const { data, error } = await withTimeout(
      signIn({ provider, redirectTo }),
      timeoutMs,
      socialAuthTimeoutMessage(provider),
    )
    if (error) {
      return { ok: false, message: error.message }
    }
    if (!data.url) {
      return {
        ok: false,
        message: `Could not start ${PROVIDER_LABEL[provider]} sign-in.`,
      }
    }
    return { ok: true, url: data.url }
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : `Could not start ${PROVIDER_LABEL[provider]} sign-in.`,
    }
  }
}
