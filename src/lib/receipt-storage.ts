import type { SupabaseClient } from '@supabase/supabase-js'

/** Private Supabase Storage bucket that holds expense receipt images. */
export const RECEIPTS_BUCKET = 'receipts'

/** Display-only lifetime. The database stores the object path, not this URL. */
export const RECEIPT_SIGNED_URL_SECONDS = 3600

const LEGACY_HTTP_URL = /^https?:\/\//i

/**
 * `expenses.receipt_url` used to store a one-hour signed URL.
 * New rows store the object path (`{userId}/{filename}`).
 * Values that start with http/https are legacy signed (or public) URLs.
 */
export function isLegacyReceiptUrl(value: string): boolean {
  return LEGACY_HTTP_URL.test(value.trim())
}

function isSafeObjectPath(path: string): boolean {
  if (!path || path.length > 1024) return false
  if (path.startsWith('/') || path.endsWith('/')) return false
  if (path.includes('..') || path.includes('\\') || path.includes('?') || path.includes('#') || path.includes('\0')) {
    return false
  }
  return true
}

function pathFromLegacyReceiptUrl(value: string): string | null {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }

  const marker = `/${RECEIPTS_BUCKET}/`
  const idx = url.pathname.indexOf(marker)
  if (idx === -1) return null

  let decoded: string
  try {
    decoded = decodeURIComponent(url.pathname.slice(idx + marker.length))
  } catch {
    return null
  }

  const path = decoded.replace(/^\/+/, '')
  return isSafeObjectPath(path) ? path : null
}

/**
 * Object path inside the receipts bucket.
 * Legacy https URLs are parsed back to that path when the bucket segment is present.
 * Returns null when the value is empty or a URL we cannot map onto an object.
 */
export function receiptObjectPath(stored: string | null | undefined): string | null {
  if (!stored?.trim()) return null
  const value = stored.trim()

  if (isLegacyReceiptUrl(value)) return pathFromLegacyReceiptUrl(value)

  // Any other scheme (data:, blob:, ...) is not a storage path.
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return null

  const path = value.replace(/^\/+/, '').replace(new RegExp(`^${RECEIPTS_BUCKET}/`), '')
  return isSafeObjectPath(path) ? path : null
}

/** Value written to `expenses.receipt_url`: the object path, or the original legacy URL if it cannot be parsed. */
export function receiptValueToPersist(stored: string | null | undefined): string | null {
  if (!stored?.trim()) return null
  return receiptObjectPath(stored) ?? stored.trim()
}

/** Short-lived URL for an `<img>` / link. Legacy rows are re-signed from the path embedded in the old URL. */
export async function signReceiptDisplayUrl(
  supabase: SupabaseClient,
  stored: string,
): Promise<string | null> {
  try {
    const path = receiptObjectPath(stored)
    if (path) {
      const { data, error } = await supabase.storage
        .from(RECEIPTS_BUCKET)
        .createSignedUrl(path, RECEIPT_SIGNED_URL_SECONDS)
      if (!error && data?.signedUrl) return data.signedUrl
    }
  } catch (err) {
    console.error('Receipt preview failed:', err)
  }

  // Signing failed or the URL is not one of ours. Still try the stored https value.
  return isLegacyReceiptUrl(stored) ? stored.trim() : null
}

/** Best-effort delete. Failures are logged and never thrown, so the form can still clear the field. */
export async function deleteReceiptObject(
  supabase: SupabaseClient,
  stored: string | null | undefined,
): Promise<void> {
  const path = receiptObjectPath(stored)
  if (!path) return

  try {
    const { error } = await supabase.storage.from(RECEIPTS_BUCKET).remove([path])
    if (error) console.error('Receipt delete failed:', error.message)
  } catch (err) {
    console.error('Receipt delete failed:', err)
  }
}
