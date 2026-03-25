/**
 * Shared helper: persist agent decisions as draft invoices in Supabase.
 * Used by both the cron job and the manual bulk UI.
 */

import { createClient } from '@supabase/supabase-js'
import type { AgentDecision } from './invoice-agent'

export type CreatedInvoice = {
  id: string
  invoice_number: string
  child_id: string
  child_name: string
  total: number
  agent_notes: string | null
  generated_by: 'cron' | 'bulk'
}

export type SkippedChild = {
  child_id: string
  child_name: string
  reason: string
}

export async function persistInvoices(
  decisions: AgentDecision[],
  childminderUserId: string,
  childNameMap: Record<string, string>,
  generatedBy: 'cron' | 'bulk',
  weekStart: string,
  weekEnd: string,
  serviceRoleKey: string
): Promise<{ created: CreatedInvoice[]; skipped: SkippedChild[] }> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { persistSession: false } }
  )

  const created: CreatedInvoice[] = []
  const skipped: SkippedChild[] = []

  for (const decision of decisions) {
    const childName = childNameMap[decision.child_id] || decision.child_id

    if (!decision.generate || decision.line_items.length === 0) {
      skipped.push({
        child_id: decision.child_id,
        child_name: childName,
        reason: decision.skip_reason || 'No scheduled days this week',
      })
      continue
    }

    // Dedup: check if a draft/sent invoice already exists for this child + week
    const { data: existing } = await supabase
      .from('invoices')
      .select('id')
      .eq('childminder_id', childminderUserId)
      .eq('child_id', decision.child_id)
      .gte('issue_date', weekStart)
      .lte('issue_date', weekEnd)
      .not('status', 'eq', 'draft') // allow re-creation if previous was only a draft
      .maybeSingle()

    if (existing) {
      skipped.push({
        child_id: decision.child_id,
        child_name: childName,
        reason: 'Invoice already exists for this week',
      })
      continue
    }

    // Get next invoice number
    const { data: invNumber } = await supabase.rpc('get_next_invoice_number', {
      p_childminder_id: childminderUserId,
    })

    const total = decision.week_total

    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invNumber,
        childminder_id: childminderUserId,
        child_id: decision.child_id,
        status: 'draft',
        issue_date: weekStart,
        due_date: new Date(new Date(weekEnd).getTime() + 14 * 86400000).toISOString().split('T')[0],
        subtotal: total,
        total,
        notes: '',
        generated_by: generatedBy,
        agent_notes: decision.agent_notes,
      })
      .select()
      .single()

    if (invError || !invoice) {
      console.error('Failed to create invoice for', childName, invError)
      continue
    }

    // Insert line items
    await supabase.from('invoice_line_items').insert(
      decision.line_items.map(item => ({
        invoice_id: invoice.id,
        description: item.description,
        care_date: item.care_date,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: item.amount,
      }))
    )

    created.push({
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      child_id: decision.child_id,
      child_name: childName,
      total,
      agent_notes: decision.agent_notes,
      generated_by: generatedBy,
    })
  }

  return { created, skipped }
}
