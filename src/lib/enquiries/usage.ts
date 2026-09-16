import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { log } from '@/lib/log'
import { monthlyHardCap } from './quota.mjs'

let cached: SupabaseClient | null = null

function getAdmin(): SupabaseClient | null {
  if (cached) return cached
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  cached = createClient(url, key, { auth: { persistSession: false } })
  return cached
}

export function utcMonthStart(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10)
}

/**
 * Atomically increment this subscriber's monthly AI-draft counter.
 * Returns the new count, or null if the RPC/admin client is unavailable
 * (callers must fail-closed — never treat null as "zero used").
 */
export async function incrementEnquiryDraftUsage(userId: string): Promise<number | null> {
  const admin = getAdmin()
  if (!admin) {
    log.warn('enquiry_usage_admin_missing', { hint: 'SUPABASE_SERVICE_ROLE_KEY' })
    return null
  }

  const { data, error } = await admin
    .rpc('increment_enquiry_ai_usage', {
      p_user: userId,
      p_period: utcMonthStart(),
    })
    .single<number>()

  if (error) {
    log.warn('enquiry_usage_rpc_missing', { error: error.message, hint: 'apply 20260829_enquiry_ai_usage' })
    return null
  }

  if (typeof data === 'number') return data
  const wrapped = data as unknown as { increment_enquiry_ai_usage?: number }
  return wrapped?.increment_enquiry_ai_usage ?? null
}

/** When the counter cannot be read, pretend the hard cap is already exceeded so the model is not called. */
export function failClosedUsageCount(): number {
  return monthlyHardCap() + 1
}

/** This request plus drafts already stored this UTC month — used only if the RPC is missing. */
export function usageFromStoredDrafts(existingThisMonth: number): number {
  return Math.max(0, existingThisMonth) + 1
}
