import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'
import {
  PORTAL_OAUTH_CALLBACK_PATH,
  SOFT_LAUNCH_PREVIEW_ORIGIN,
  portalOAuthRedirectTo,
  socialAuthMissingEnvMessage,
  socialAuthRedirectBlockedMessage,
  socialAuthTimeoutMessage,
  startSocialAuth,
} from './social-oauth.ts'

const here = dirname(fileURLToPath(import.meta.url))

describe('portalOAuthRedirectTo', () => {
  it('uses the Preview origin, not NEXT_PUBLIC_APP_URL / production', () => {
    assert.equal(
      portalOAuthRedirectTo(SOFT_LAUNCH_PREVIEW_ORIGIN),
      `${SOFT_LAUNCH_PREVIEW_ORIGIN}${PORTAL_OAUTH_CALLBACK_PATH}`,
    )
    assert.equal(
      portalOAuthRedirectTo(`${SOFT_LAUNCH_PREVIEW_ORIGIN}/`),
      `${SOFT_LAUNCH_PREVIEW_ORIGIN}/auth/callback`,
    )
  })
})

describe('startSocialAuth', () => {
  it('fails clearly when Preview has no public Supabase env', async () => {
    const result = await startSocialAuth({
      provider: 'google',
      origin: SOFT_LAUNCH_PREVIEW_ORIGIN,
      hasPublicEnv: false,
      signIn: async () => {
        throw new Error('signIn must not run without env')
      },
    })
    assert.deepEqual(result, {
      ok: false,
      message: socialAuthMissingEnvMessage('google'),
    })
  })

  it('returns the OAuth URL and the Preview callback as redirectTo', async () => {
    let seenRedirectTo = ''
    const result = await startSocialAuth({
      provider: 'google',
      origin: SOFT_LAUNCH_PREVIEW_ORIGIN,
      hasPublicEnv: true,
      signIn: async ({ redirectTo }) => {
        seenRedirectTo = redirectTo
        return {
          data: { url: 'https://example.supabase.co/auth/v1/authorize?provider=google' },
          error: null,
        }
      },
    })
    assert.equal(seenRedirectTo, `${SOFT_LAUNCH_PREVIEW_ORIGIN}/auth/callback`)
    assert.deepEqual(result, {
      ok: true,
      url: 'https://example.supabase.co/auth/v1/authorize?provider=google',
    })
  })

  it('surfaces provider errors instead of spinning', async () => {
    const result = await startSocialAuth({
      provider: 'google',
      origin: SOFT_LAUNCH_PREVIEW_ORIGIN,
      hasPublicEnv: true,
      signIn: async () => ({
        data: { url: null },
        error: { message: 'Unsupported provider: google' },
      }),
    })
    assert.deepEqual(result, { ok: false, message: 'Unsupported provider: google' })
  })

  it('times out a hung signIn so the spinner can clear', async () => {
    const result = await startSocialAuth({
      provider: 'google',
      origin: SOFT_LAUNCH_PREVIEW_ORIGIN,
      hasPublicEnv: true,
      timeoutMs: 20,
      signIn: () => new Promise(() => {}),
    })
    assert.deepEqual(result, {
      ok: false,
      message: socialAuthTimeoutMessage('google'),
    })
  })

  it('catches throws from createClient / signInWithOAuth', async () => {
    const result = await startSocialAuth({
      provider: 'apple',
      origin: SOFT_LAUNCH_PREVIEW_ORIGIN,
      hasPublicEnv: true,
      signIn: async () => {
        throw new Error('supabaseUrl is required.')
      },
    })
    assert.deepEqual(result, { ok: false, message: 'supabaseUrl is required.' })
  })
})

describe('Soft Launch Preview login Google Continue', () => {
  it('SSO buttons skip the implicit redirect and recover if navigation is blocked', () => {
    const buttons = readFileSync(join(here, '../../components/SSOButtons.tsx'), 'utf8')
    assert.match(buttons, /skipBrowserRedirect:\s*true/)
    assert.match(buttons, /startSocialAuth/)
    assert.match(buttons, /socialAuthRedirectBlockedMessage/)
    assert.match(buttons, /window\.location\.assign/)
    assert.match(buttons, /toast\.error/)
  })

  it('CSP form-action allows Supabase and Google/Apple OAuth hops', () => {
    const config = readFileSync(join(here, '../../../next.config.ts'), 'utf8')
    assert.match(config, /form-action 'self'/)
    assert.match(config, /https:\/\/\*\.supabase\.co/)
    assert.match(config, /https:\/\/accounts\.google\.com/)
    assert.match(config, /https:\/\/appleid\.apple\.com/)
  })

  it('login surfaces a failed OAuth callback instead of a silent return', () => {
    const login = readFileSync(join(here, '../../app/(auth)/login/page.tsx'), 'utf8')
    assert.match(login, /auth_callback_failed/)
    assert.match(login, /toast\.error/)
  })

  it('documents the exact Soft Launch Preview callback for Erhan', () => {
    const source = readFileSync(join(here, 'social-oauth.ts'), 'utf8')
    assert.match(
      source,
      /invoicing-for-childminders-git-cur-cfb18c-erhan-timurs-projects\.vercel\.app\/auth\/callback/,
    )
    assert.equal(socialAuthRedirectBlockedMessage('google').includes('Supabase Auth redirect URLs'), true)
  })
})
