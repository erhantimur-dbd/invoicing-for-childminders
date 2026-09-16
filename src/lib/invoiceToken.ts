import { createHmac, timingSafeEqual } from 'crypto'

const TOKEN_TTL_MS = 2 * 60 * 60 * 1000 // 2 hours

function getSecret(): string {
  const secret = process.env.INVOICE_VERIFY_SECRET
  if (!secret || secret.length < 32) {
    throw new Error(
      'INVOICE_VERIFY_SECRET is not set or is too short (need ≥32 chars). Refusing to issue or verify invoice tokens.'
    )
  }
  return secret
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('hex')
}

/** Create a signed access token for a verified invoice */
export function createInvoiceToken(invoiceId: string): string {
  const payload = `${invoiceId}:${Date.now()}`
  const sig = sign(payload)
  return Buffer.from(`${payload}:${sig}`).toString('base64url')
}

/** Verify token and return true iff signature is valid, not expired, and matches invoiceId */
export function verifyInvoiceToken(token: string, invoiceId: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8')
    const parts = decoded.split(':')
    if (parts.length !== 3) return false
    const [id, ts, sig] = parts
    if (id !== invoiceId) return false
    const issuedAt = Number(ts)
    if (!Number.isFinite(issuedAt)) return false
    if (Date.now() - issuedAt > TOKEN_TTL_MS) return false

    const expected = sign(`${id}:${ts}`)
    const a = Buffer.from(sig, 'hex')
    const b = Buffer.from(expected, 'hex')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}
