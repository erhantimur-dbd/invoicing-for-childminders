import { createHmac, timingSafeEqual } from 'crypto'

function getSecret(): string {
  const secret = process.env.INVOICE_VERIFY_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('INVOICE_VERIFY_SECRET is not configured')
    }
    // Dev-only fallback so local public invoice viewing still works.
    return 'fallback-dev-secret'
  }
  return secret
}

const TOKEN_TTL_MS = 2 * 60 * 60 * 1000 // 2 hours

/** Create a signed access token for a verified invoice */
export function createInvoiceToken(invoiceId: string): string {
  const payload = `${invoiceId}:${Date.now()}`
  const sig = createHmac('sha256', getSecret()).update(payload).digest('hex')
  return Buffer.from(`${payload}:${sig}`).toString('base64url')
}

/** Verify token and return true if valid for this invoiceId */
export function verifyInvoiceToken(token: string, invoiceId: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8')
    const parts = decoded.split(':')
    if (parts.length !== 3) return false
    const [id, ts, sig] = parts
    if (id !== invoiceId) return false
    if (!ts || Number.isNaN(Number(ts))) return false
    if (Date.now() - Number(ts) > TOKEN_TTL_MS) return false
    const expectedSig = createHmac('sha256', getSecret()).update(`${id}:${ts}`).digest('hex')
    const a = Buffer.from(sig, 'utf8')
    const b = Buffer.from(expectedSig, 'utf8')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}
