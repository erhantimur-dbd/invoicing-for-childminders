/**
 * Distributed rate limiter backed by the Supabase `rate_limits` table.
 *
 * Why Supabase, not Upstash/Redis: keeps infra to one provider. The cost is
 * one RPC per request, fine for the surfaces this protects (contact form,
 * invoice DOB verify, agent endpoints).
 *
 * Atomic increment is done by a Postgres function (`increment_rate_limit`)
 * defined in `supabase/migrations/20260506_rate_limits_and_stripe_events.sql`.
 *
 * Fail-open if the table/function isn't present yet so deploys don't break
 * before the migration is applied — but log loudly.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { log } from '@/lib/log'

type Result =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSeconds: number }

interface Options {
  bucket: string
  identifier: string
  limit: number
  windowMs: number
}

let warned = false
let cached: SupabaseClient | null = null

function getAdmin(): SupabaseClient | null {
  if (cached) return cached
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  cached = createClient(url, key, { auth: { persistSession: false } })
  return cached
}

export async function rateLimit(opts: Options): Promise<Result> {
  const { bucket, identifier, limit, windowMs } = opts
  const admin = getAdmin()
  if (!admin) return { ok: true, remaining: limit }

  const now = Date.now()
  const windowStartMs = Math.floor(now / windowMs) * windowMs
  const windowStart = new Date(windowStartMs).toISOString()

  const { data, error } = await admin
    .rpc('increment_rate_limit', {
      p_bucket: bucket,
      p_identifier: identifier,
      p_window: windowStart,
    })
    .single<number>()

  if (error) {
    if (!warned) {
      warned = true
      log.warn('rate_limit_rpc_missing', { hint: 'apply 20260506 migration', error: error.message })
    }
    return { ok: true, remaining: limit }
  }

  // Supabase wraps scalar returns; data may be number or { increment_rate_limit: number }
  const hits =
    typeof data === 'number'
      ? data
      : ((data as unknown as { increment_rate_limit: number })?.increment_rate_limit ?? 0)

  if (hits > limit) {
    const retryAfterSeconds = Math.ceil((windowStartMs + windowMs - now) / 1000)
    return { ok: false, retryAfterSeconds: Math.max(1, retryAfterSeconds) }
  }
  return { ok: true, remaining: Math.max(0, limit - hits) }
}

/**
 * Best-available client identifier. On Vercel, `x-real-ip` is set by the
 * platform from the trusted edge; `x-forwarded-for` is attacker-controllable
 * past the first hop.
 */
export function clientIp(headers: Headers): string {
  const real = headers.get('x-real-ip')
  if (real) return real
  const fwd = headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return 'unknown'
}
