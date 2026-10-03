import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'
import { loginRedirectTarget } from './login-redirect.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

describe('loginRedirectTarget', () => {
  it('sends a signed-in visit to the dashboard', () => {
    assert.equal(loginRedirectTarget(null), '/dashboard')
    assert.equal(loginRedirectTarget(undefined), '/dashboard')
    assert.equal(loginRedirectTarget(''), '/dashboard')
  })

  it('keeps a safe next path and drops off-site or login loops', () => {
    assert.equal(loginRedirectTarget('/enquiries'), '/enquiries')
    assert.equal(loginRedirectTarget('/enquiries/abc'), '/enquiries/abc')
    assert.equal(loginRedirectTarget('https://evil.example'), '/dashboard')
    assert.equal(loginRedirectTarget('//evil.example'), '/dashboard')
    assert.equal(loginRedirectTarget('/\\evil'), '/dashboard')
    assert.equal(loginRedirectTarget('/login'), '/dashboard')
    assert.equal(loginRedirectTarget('/login?error=auth_callback_failed'), '/dashboard')
  })
})

describe('login route', () => {
  const page = readFileSync(join(root, 'app/(auth)/login/page.tsx'), 'utf8')
  const home = readFileSync(join(root, 'app/page.tsx'), 'utf8')

  it('redirects a signed-in user on the server and fails open', () => {
    assert.match(page, /getUser/)
    assert.match(page, /loginRedirectTarget/)
    assert.match(page, /redirect\(/)
    assert.match(page, /NEXT_REDIRECT/)
    assert.match(page, /LoginForm/)
    assert.doesNotMatch(home, /createClient/)
    assert.doesNotMatch(home, /getUser/)
  })
})
