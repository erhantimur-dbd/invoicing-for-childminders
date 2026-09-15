import { createHmac, timingSafeEqual } from 'node:crypto'

const TTL_MS = 7 * 24 * 60 * 60 * 1000

function secret() {
  const s = process.env.INVOICE_VERIFY_SECRET
  if (!s || s.length < 32) throw new Error('INVOICE_VERIFY_SECRET is not set')
  return s
}

export function createInvoicePaySig(invoiceId, now = Date.now()) {
  const payload = `pay:${invoiceId}:${now}`
  const sig = createHmac('sha256', secret()).update(payload).digest('hex')
  return Buffer.from(`${payload}:${sig}`).toString('base64url')
}

export function verifyInvoicePaySig(invoiceId, token) {
  try {
    const decoded = Buffer.from(String(token || ''), 'base64url').toString('utf8')
    const parts = decoded.split(':')
    if (parts.length !== 4 || parts[0] !== 'pay') return false
    const [, id, ts, sig] = parts
    if (id !== invoiceId) return false
    const issuedAt = Number(ts)
    if (!Number.isFinite(issuedAt) || Date.now() - issuedAt > TTL_MS) return false
    const expected = createHmac('sha256', secret()).update(`pay:${id}:${ts}`).digest('hex')
    const a = Buffer.from(sig, 'hex')
    const b = Buffer.from(expected, 'hex')
    return a.length === b.length && timingSafeEqual(a, b)
  } catch {
    return false
  }
}
