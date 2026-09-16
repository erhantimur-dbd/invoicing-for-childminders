import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Flip every 'sent' invoice whose due date has passed to 'overdue'.
 *
 * Runs every cron tick (hourly) regardless of whose invoice-generation day it
 * is. The dashboard tile, invoice filters and outstanding totals already key
 * on status === 'overdue', so this single update lights those up.
 */
export async function markOverdueInvoices(
  supabaseAdmin: SupabaseClient
): Promise<{ marked: number }> {
  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await supabaseAdmin
    .from('invoices')
    .update({ status: 'overdue', updated_at: new Date().toISOString() })
    .eq('status', 'sent')
    .not('due_date', 'is', null)
    .lt('due_date', today)
    .select('id')

  if (error) {
    console.error('[cron/overdue] failed to mark overdue invoices:', error.message)
    return { marked: 0 }
  }
  return { marked: data?.length ?? 0 }
}
