import { createHmac } from 'crypto'

const SECRET = process.env.INVOICE_VERIFY_SECRET || 'fallback-dev-secret'
const TOKEN_TTL_MS = 2 * 60 * 60 * 1000 // 2 hours

/** Create a signed access token for a verified invoice */
export function createInvoiceToken(invoiceId: string): string {
  const payload = `${invoiceId}:${Date.now()}`
  const sig = createHmac('sha256', SECRET).update(payload).digest('hex')
  return Buffer.from(`${payload}:${sig}`).toString('base64url')
}

/** Verify token and return invoiceId if valid, null otherwise */
export function verifyInvoiceToken(token: string, invoiceId: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8')
    const parts = decoded.split(':')
    if (parts.length !== 3) return false
    const [id, ts, sig] = parts
    if (id !== invoiceId) return false
    if (Date.now() - Number(ts) > TOKEN_TTL_MS) return false
    const expectedSig = createHmac('sha256', SECRET).update(`${id}:${ts}`).digest('hex')
    return sig === expectedSig
  } catch {
    return false
  }
}
