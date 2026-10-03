import type { SupabaseClient } from '@supabase/supabase-js'
import { accountAllowlistGate } from '@/lib/preview-guard'

/**
 * Flip every 'sent' invoice whose due date has passed to 'overdue'.
 *
 * Runs every cron tick (hourly) regardless of whose invoice-generation day it
 * is. The dashboard tile, invoice filters and outstanding totals already key
 * on status === 'overdue', so this single update lights those up.
 */
export async function markOverdueInvoices(
  supabaseAdmin: SupabaseClient,
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ marked: number }> {
  const gate = accountAllowlistGate(env)
  if (!gate.allow) return { marked: 0 }

  const today = new Date().toISOString().slice(0, 10)

  let query = supabaseAdmin
    .from('invoices')
    .update({ status: 'overdue', updated_at: new Date().toISOString() })
    .eq('status', 'sent')
    .not('due_date', 'is', null)
    .lt('due_date', today)

  if (gate.ids) query = query.in('childminder_id', gate.ids)

  const { data, error } = await query.select('id')

  if (error) {
    console.error('[cron/overdue] failed to mark overdue invoices:', error.message)
    return { marked: 0 }
  }
  return { marked: data?.length ?? 0 }
}
