import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
  runInvoiceAgent,
  buildFallbackDecisions,
  fetchUKBankHolidays,
  getPreviousWeekDates,
  type AgentChild,
} from '@/lib/agent/invoice-agent'

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
    // Optionally accept custom week range from the bulk UI
    const customStart: string | undefined = body.week_start
    const customEnd: string | undefined = body.week_end
    const childIds: string[] | undefined = body.child_ids // filter to specific children

    // Resolve week dates
    let weekDates: string[]
    if (customStart && customEnd) {
      weekDates = []
      const current = new Date(customStart + 'T00:00:00')
      const end = new Date(customEnd + 'T00:00:00')
      while (current <= end) {
        const day = current.getDay()
        if (day !== 0 && day !== 6) {
          weekDates.push(current.toISOString().split('T')[0])
        }
        current.setDate(current.getDate() + 1)
      }
    } else {
      weekDates = getPreviousWeekDates().dates
    }

    // Fetch children with schedules
    let query = supabase
      .from('children')
      .select('id, first_name, last_name, parent_name, daily_rate, half_day_rate, hourly_rate, hours_per_day, schedule_days, schedule_note, funding_type, funded_hours_per_day, funded_days')
      .eq('childminder_id', user.id)
      .eq('is_active', true)
      .not('schedule_days', 'eq', '[]')
      .not('schedule_days', 'is', null)

    if (childIds?.length) {
      query = query.in('id', childIds)
    }

    const { data: childRows, error: childError } = await query
    if (childError) return NextResponse.json({ error: 'Failed to fetch children' }, { status: 500 })

    if (!childRows || childRows.length === 0) {
      return NextResponse.json({ decisions: [], week_dates: weekDates, message: 'No children with fixed schedules' })
    }

    const children: AgentChild[] = childRows.map(c => ({
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
      parent_name: c.parent_name,
      daily_rate: Number(c.daily_rate),
      half_day_rate: c.half_day_rate ? Number(c.half_day_rate) : null,
      hourly_rate: c.hourly_rate ? Number(c.hourly_rate) : null,
      hours_per_day: c.hours_per_day ? Number(c.hours_per_day) : null,
      schedule_days: Array.isArray(c.schedule_days) ? c.schedule_days : [],
      schedule_note: c.schedule_note || null,
      funding_type: c.funding_type || 'none',
      funded_hours_per_day: c.funded_hours_per_day ? Number(c.funded_hours_per_day) : null,
      funded_days: Array.isArray(c.funded_days) ? c.funded_days : null,
    }))

    // Fetch bank holidays
    const bankHolidays = await fetchUKBankHolidays()

    // Run agent (with fallback if ANTHROPIC_API_KEY missing)
    let decisions
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        decisions = await runInvoiceAgent(children, weekDates, bankHolidays)
      } catch (agentError) {
        console.error('Agent error, falling back to deterministic:', agentError)
        decisions = buildFallbackDecisions(children, weekDates, bankHolidays)
      }
    } else {
      decisions = buildFallbackDecisions(children, weekDates, bankHolidays)
    }

    return NextResponse.json({ decisions, week_dates: weekDates, children_count: children.length })
  } catch (err) {
    console.error('invoice-decisions error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
