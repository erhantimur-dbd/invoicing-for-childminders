import { createHmac, timingSafeEqual } from 'node:crypto'

const TTL_MS = 7 * 24 * 60 * 60 * 1000

function secret() {
  const s = process.env.INVOICE_VERIFY_SECRET
  if (!s || s.length < 32) throw new Error('INVOICE_VERIFY_SECRET is not set')
  return s
}

function sign(payload) {
  return createHmac('sha256', secret()).update(payload).digest('hex')
}

export function createOnboardToken(prospectId, now = Date.now()) {
  const payload = `onboard:${prospectId}:${now}`
  const sig = sign(payload)
  return Buffer.from(`${payload}:${sig}`).toString('base64url')
}

export function verifyOnboardToken(token) {
  try {
    const decoded = Buffer.from(String(token || ''), 'base64url').toString('utf8')
    const parts = decoded.split(':')
    if (parts.length !== 4 || parts[0] !== 'onboard') return { ok: false, reason: 'invalid' }
    const [, prospectId, ts, sig] = parts
    const issuedAt = Number(ts)
    if (!prospectId || !Number.isFinite(issuedAt)) return { ok: false, reason: 'invalid' }
    if (Date.now() - issuedAt > TTL_MS) return { ok: false, reason: 'expired' }
    const expected = sign(`onboard:${prospectId}:${ts}`)
    const a = Buffer.from(sig, 'hex')
    const b = Buffer.from(expected, 'hex')
    if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: 'invalid' }
    return { ok: true, prospectId }
  } catch {
    return { ok: false, reason: 'invalid' }
  }
}

export function placeOfferUrl(token, origin) {
  const base = String(origin || process.env.NEXT_PUBLIC_APP_URL || 'https://www.godottie.cloud').replace(/\/$/, '')
  return `${base}/signup-place/${encodeURIComponent(token)}`
}
