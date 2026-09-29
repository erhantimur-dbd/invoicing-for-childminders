import { createHmac, timingSafeEqual } from 'crypto'

const TOKEN_TTL_MS = 2 * 60 * 60 * 1000 // 2 hours

function getSecret(): string | null {
  const secret = process.env.INVOICE_VERIFY_SECRET?.trim()
  if (!secret) return null
  return secret
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

function signaturesMatch(provided: string, expected: string): boolean {
  const providedBuf = Buffer.from(provided)
  const expectedBuf = Buffer.from(expected)
  if (providedBuf.length !== expectedBuf.length) return false
  return timingSafeEqual(providedBuf, expectedBuf)
}

/** Create a signed access token for a verified invoice. Missing secret fails closed. */
export function createInvoiceToken(invoiceId: string): string {
  const secret = getSecret()
  if (!secret) {
    throw new Error('INVOICE_VERIFY_SECRET is not configured')
  }
  const payload = `${invoiceId}:${Date.now()}`
  const sig = sign(payload, secret)
  return Buffer.from(`${payload}:${sig}`).toString('base64url')
}

/** Verify token for this invoice. Missing secret or a bad signature returns false. */
export function verifyInvoiceToken(token: string, invoiceId: string): boolean {
  const secret = getSecret()
  if (!secret) return false

  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8')
    const parts = decoded.split(':')
    if (parts.length !== 3) return false
    const [id, ts, sig] = parts
    if (id !== invoiceId) return false
    if (Date.now() - Number(ts) > TOKEN_TTL_MS) return false
    const expectedSig = sign(`${id}:${ts}`, secret)
    return signaturesMatch(sig, expectedSig)
  } catch {
    return false
  }
}
