import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { persistInvoices } from '@/lib/agent/create-invoices'
import type { AgentDecision } from '@/lib/agent/invoice-agent'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    const body = await request.json()
    const decisions: AgentDecision[] = body.decisions
    const weekStart: string = body.week_start
    const weekEnd: string = body.week_end

    if (!decisions?.length) {
      return NextResponse.json({ error: 'No decisions provided' }, { status: 400 })
    }
    if (!weekStart || !weekEnd) {
      return NextResponse.json({ error: 'week_start and week_end are required' }, { status: 400 })
    }

    // Verify the caller owns every child in the payload (defence against spoofed child_ids).
    const childIds = [...new Set(decisions.map((d) => d.child_id))]
    const { data: children } = await supabase
      .from('children')
      .select('id, first_name, last_name')
      .eq('childminder_id', user.id)
      .in('id', childIds)

    const ownedIds = new Set((children || []).map((c) => c.id))
    const unauthorized = childIds.filter((id) => !ownedIds.has(id))
    if (unauthorized.length > 0) {
      return NextResponse.json({ error: 'One or more children are not yours' }, { status: 403 })
    }

    const nameMap = Object.fromEntries(
      (children || []).map((c) => [c.id, `${c.first_name} ${c.last_name}`])
    )

    const { created, skipped } = await persistInvoices(
      decisions,
      user.id,
      nameMap,
      'bulk',
      weekStart,
      weekEnd,
      serviceRoleKey
    )

    return NextResponse.json({
      created: created.map((c) => ({
        id: c.id,
        invoice_number: c.invoice_number,
        child_name: c.child_name,
        total: c.total,
        agent_notes: c.agent_notes,
      })),
      skipped: skipped.map((s) => ({
        child_name: s.child_name,
        reason: s.reason,
      })),
    })
  } catch (err) {
    console.error('bulk-create error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
