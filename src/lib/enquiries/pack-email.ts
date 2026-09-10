/**
 * Public URL for a starter-pack file. Navy marketing /pack/[slug] lists
 * enquiry_knowledge documents; this helper was referenced by that page but
 * never landed on dormant. Keep it Preview-safe: no throw when env is missing.
 */
export function packFilePublicUrl(filePath: string | null | undefined): string | null {
  if (!filePath) return null
  const trimmed = filePath.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  if (!base) return null

  const clean = trimmed.replace(/^\/+/, '')
  const slash = clean.indexOf('/')
  if (slash > 0) {
    const bucket = clean.slice(0, slash)
    const objectPath = clean.slice(slash + 1)
    if (objectPath) {
      return `${base}/storage/v1/object/public/${bucket}/${objectPath}`
    }
  }

  return `${base}/storage/v1/object/public/enquiry-knowledge/${clean}`
}
