/**
 * Classify provider errors that should trip Grok → Anthropic failover.
 *
 * Fail over on downtime and transport/auth/overloaded errors. Do not fail over
 * on caller/prompt bugs (400 / 404 / 422) — those would just fail twice.
 */

export class EmptyModelOutputError extends Error {
  readonly provider: string

  constructor(provider: string) {
    super(`${provider} returned an empty reply.`)
    this.name = 'EmptyModelOutputError'
    this.provider = provider
  }
}

const FAILOVER_STATUSES = new Set([401, 403, 408, 409, 429, 500, 502, 503, 504, 529])

const FAILOVER_MESSAGE = /timeout|timed out|econnreset|econnrefused|enotfound|enetunreach|socket hang up|fetch failed|network|overloaded|unavailable|529|eai_again/i

export function statusFromUnknown(err: unknown): number | undefined {
  if (!err || typeof err !== 'object') return undefined
  const rec = err as { status?: unknown; statusCode?: unknown }
  if (typeof rec.status === 'number') return rec.status
  if (typeof rec.statusCode === 'number') return rec.statusCode
  return undefined
}

export function isFailoverError(err: unknown): boolean {
  if (err == null) return true
  if (err instanceof EmptyModelOutputError) return true
  if (err instanceof TypeError || err instanceof SyntaxError) return false

  const status = statusFromUnknown(err)
  if (status !== undefined) {
    if (FAILOVER_STATUSES.has(status) || status >= 500) return true
    if (status === 400 || status === 404 || status === 422) return false
  }

  if (err instanceof Error) {
    if (
      err.name === 'APIConnectionError' ||
      err.name === 'APIConnectionTimeoutError' ||
      err.name === 'APIUserAbortError'
    ) {
      return true
    }
    if (FAILOVER_MESSAGE.test(err.message) || FAILOVER_MESSAGE.test(err.name)) return true
  }

  // Unknown SDK / HTTP shapes: prefer a working Anthropic reply over a hard fail.
  return true
}
