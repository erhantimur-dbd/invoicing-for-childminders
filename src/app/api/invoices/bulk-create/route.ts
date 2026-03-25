import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { AgentDecision } from '@/lib/agent/invoice-agent'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const decisions: AgentDecision[] = body.decisions
    const weekStart: string = body.week_start
    const weekEnd: string = body.week_end

    if (!decisions?.length) {
      return NextResponse.json({ error: 'No decisions provided' }, { status: 400 })
    }

    const created = []
    const skipped = []

    // Fetch child names for response
    const childIds = decisions.map(d => d.child_id)
    const { data: children } = await supabase
      .from('children')
      .select('id, first_name, last_name')
      .in('id', childIds)

    const nameMap = Object.fromEntries(
      (children || []).map(c => [c.id, `${c.first_name} ${c.last_name}`])
    )

    for (const decision of decisions) {
      const childName = nameMap[decision.child_id] || decision.child_id

      if (!decision.generate || decision.line_items.length === 0) {
        skipped.push({ child_name: childName, reason: decision.skip_reason || 'No scheduled days' })
        continue
      }

      // Dedup: skip if non-draft invoice already exists for this child + week
      const { data: existing } = await supabase
        .from('invoices')
        .select('id')
        .eq('childminder_id', user.id)
        .eq('child_id', decision.child_id)
        .gte('issue_date', weekStart)
        .lte('issue_date', weekEnd)
        .in('status', ['sent', 'paid'])
        .maybeSingle()

      if (existing) {
        skipped.push({ child_name: childName, reason: 'Invoice already sent/paid for this week' })
        continue
      }

      // Get next invoice number
      const { data: invNumber } = await supabase.rpc('get_next_invoice_number', {
        p_childminder_id: user.id,
      })

      const dueDate = new Date(new Date(weekEnd + 'T00:00:00').getTime() + 14 * 86400000)
        .toISOString().split('T')[0]

      const { data: invoice, error: invError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invNumber,
          childminder_id: user.id,
          child_id: decision.child_id,
          status: 'draft',
          issue_date: weekStart,
          due_date: dueDate,
          subtotal: decision.week_total,
          total: decision.week_total,
          notes: '',
          generated_by: 'bulk',
          agent_notes: decision.agent_notes,
        })
        .select()
        .single()

      if (invError || !invoice) {
        console.error('Failed to create invoice:', invError)
        skipped.push({ child_name: childName, reason: 'Database error' })
        continue
      }

      // Insert line items
      const { error: itemsError } = await supabase.from('invoice_line_items').insert(
        decision.line_items.map(item => ({
          invoice_id: invoice.id,
          description: item.description,
          care_date: item.care_date,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount,
        }))
      )

      if (itemsError) {
        console.error('Failed to insert line items:', itemsError)
      }

      created.push({
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        child_name: childName,
        total: decision.week_total,
        agent_notes: decision.agent_notes,
      })
    }

    return NextResponse.json({ created, skipped })
  } catch (err) {
    console.error('bulk-create error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
