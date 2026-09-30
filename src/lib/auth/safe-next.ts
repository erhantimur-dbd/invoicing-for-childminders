/**
 * Only allow same-origin redirects starting with a single "/", and reject
 * "//", "/\", or anything that could escape to another host.
 */
export function safeNext(raw: string | null, fallback = '/dashboard'): string {
  if (!raw) return fallback
  if (!raw.startsWith('/')) return fallback
  if (raw.startsWith('//') || raw.startsWith('/\\')) return fallback
  return raw
}
