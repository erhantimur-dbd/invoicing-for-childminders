/**
 * App-level AES-256-GCM encryption for sensitive fields (bank details).
 *
 * Why app-level instead of pg_sodium / Supabase TCE: Supabase deprecated
 * Transparent Column Encryption in 2024 in favour of app-level encryption.
 * App-level keeps key custody outside the database, which is the correct
 * trust boundary — a compromise of the Supabase project does not yield
 * plaintext bank numbers.
 *
 * Format on disk: `enc:v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>`
 *   - "v1" lets us rotate the key/algo later without ambiguity.
 *   - IV is 12 bytes random per write (GCM standard).
 *
 * Key: BANK_DETAIL_ENCRYPTION_KEY env var, 32 bytes hex (64 hex chars).
 *      Generate with: `openssl rand -hex 32`. Set in Vercel encrypted env.
 *
 * Failure modes:
 *   - Missing/short key: throws — refuse to write or read.
 *   - Bad ciphertext on decrypt: throws — never silently return wrong data.
 *   - Plaintext input (no `enc:v1:` prefix) on read: passed through. This
 *     keeps the read path working during the rollout window before backfill
 *     is run. After backfill, plaintext should never be observed again.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const PREFIX = 'enc:v1:'
const ALGO = 'aes-256-gcm' as const
const IV_LEN = 12
const TAG_LEN = 16

let keyBuf: Buffer | null = null

function key(): Buffer {
  if (keyBuf) return keyBuf
  const hex = process.env.BANK_DETAIL_ENCRYPTION_KEY
  if (!hex) {
    throw new Error(
      'BANK_DETAIL_ENCRYPTION_KEY is not set. Generate with `openssl rand -hex 32` and set in env before reading or writing bank details.'
    )
  }
  if (hex.length !== 64) {
    throw new Error('BANK_DETAIL_ENCRYPTION_KEY must be 64 hex chars (32 bytes).')
  }
  keyBuf = Buffer.from(hex, 'hex')
  return keyBuf
}

export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX)
}

export function encryptField(plaintext: string | null | undefined): string | null {
  if (plaintext == null || plaintext === '') return null
  // Idempotent: never re-encrypt already-encrypted values.
  if (isEncrypted(plaintext)) return plaintext

  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALGO, key(), iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${ct.toString('hex')}`
}

export function decryptField(value: string | null | undefined): string | null {
  if (value == null || value === '') return null
  // Plaintext passthrough — supports rolling deploy before backfill completes.
  if (!isEncrypted(value)) return value

  const parts = value.slice(PREFIX.length).split(':')
  if (parts.length !== 3) throw new Error('decrypt: malformed ciphertext')
  const [ivHex, tagHex, ctHex] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const ct = Buffer.from(ctHex, 'hex')
  if (iv.length !== IV_LEN) throw new Error('decrypt: bad IV length')
  if (tag.length !== TAG_LEN) throw new Error('decrypt: bad tag length')

  const decipher = createDecipheriv(ALGO, key(), iv)
  decipher.setAuthTag(tag)
  const pt = Buffer.concat([decipher.update(ct), decipher.final()])
  return pt.toString('utf8')
}

/**
 * Mask all but the last `keep` chars. Used for default display in UI —
 * the full number only flows through when explicitly requested (PDF render,
 * print view).
 */
export function maskAccountNumber(value: string | null | undefined, keep = 4): string {
  if (!value) return ''
  if (value.length <= keep) return '••••'
  return '••••' + value.slice(-keep)
}

export function maskSortCode(value: string | null | undefined): string {
  if (!value) return ''
  // Format "XX-XX-XX" → "**-**-XX" (last pair only)
  const digits = value.replace(/\D/g, '')
  if (digits.length < 6) return '••-••-••'
  return `••-••-${digits.slice(4, 6)}`
}
