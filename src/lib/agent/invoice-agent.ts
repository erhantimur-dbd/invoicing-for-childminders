/**
 * Claude AI agent for intelligent invoice generation.
 * Handles bank holidays, term-time schedules, and schedule notes.
 */

import Anthropic from '@anthropic-ai/sdk'
import { buildLineItemsForDay, formatDateLabel } from '@/lib/funded-hours'

export type ScheduleDay = { day: string; type: 'full' | 'half' }

export type AgentChild = {
  id: string
  first_name: string
  last_name: string
  parent_name: string
  daily_rate: number
  half_day_rate: number | null
  hourly_rate: number | null
  hours_per_day: number | null
  schedule_days: ScheduleDay[]
  schedule_note: string | null
  funding_type: 'none' | '15' | '30'
  funded_hours_per_day: number | null
  funded_days: string[] | null
}

export type AgentLineItem = {
  description: string
  care_date: string
  quantity: number
  unit_price: number
  amount: number
  is_funded: boolean
}

export type AgentDecision = {
  child_id: string
  generate: boolean
  line_items: AgentLineItem[]
  skip_reason: string | null
  agent_notes: string | null
  week_total: number
}

// GOV.UK bank holidays API
async function fetchUKBankHolidays(): Promise<string[]> {
  try {
    const res = await fetch('https://www.gov.uk/bank-holidays.json', { next: { revalidate: 86400 } })
    const data = await res.json()
    const events = data['england-and-wales']?.events || []
    return events.map((e: { date: string }) => e.date)
  } catch {
    return []
  }
}

// Returns Mon–Fri dates for the previous week (relative to today)
export function getPreviousWeekDates(referenceDate?: Date): { start: string; end: string; dates: string[] } {
  const today = referenceDate || new Date()
  const dayOfWeek = today.getDay() // 0=Sun, 1=Mon ...
  const daysToLastMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const lastMonday = new Date(today)
  lastMonday.setDate(today.getDate() - daysToLastMonday - 7)

  const dates: string[] = []
  for (let i = 0; i < 5; i++) {
    const d = new Date(lastMonday)
    d.setDate(lastMonday.getDate() + i)
    dates.push(d.toISOString().split('T')[0])
  }

  return { start: dates[0], end: dates[4], dates }
}

const DAY_NAME_MAP: Record<number, string> = {
  1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday',
}

function formatDateLong(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

/**
 * Main agent function. Takes children + date range, returns per-child decisions.
 */
export async function runInvoiceAgent(
  children: AgentChild[],
  weekDates: string[],
  bankHolidays: string[]
): Promise<AgentDecision[]> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const tools: Anthropic.Tool[] = [
    {
      name: 'get_bank_holidays',
      description: 'Returns UK bank holiday dates for England and Wales',
      input_schema: {
        type: 'object' as const,
        properties: {},
        required: [],
      },
    },
    {
      name: 'check_term_time',
      description: 'Checks whether a given week falls within UK school term time based on typical England term dates. Returns { in_term: boolean, term_name?: string }',
      input_schema: {
        type: 'object' as const,
        properties: {
          week_start: { type: 'string', description: 'ISO date string for the Monday of the week e.g. 2026-04-14' },
        },
        required: ['week_start'],
      },
    },
    {
      name: 'decide_invoices',
      description: 'Submit the final per-child invoice decisions. Call this once with ALL children decisions when you are done reasoning.',
      input_schema: {
        type: 'object' as const,
        properties: {
          decisions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                child_id: { type: 'string' },
                generate: { type: 'boolean', description: 'Whether to generate an invoice for this child' },
                dates_to_invoice: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'ISO date strings for days to include (subset of weekDates, excluding bank holidays etc)',
                },
                skip_reason: { type: 'string', description: 'Reason for skipping if generate=false' },
                agent_notes: { type: 'string', description: 'Notes explaining any adjustments made, e.g. bank holiday removed' },
              },
              required: ['child_id', 'generate', 'dates_to_invoice'],
            },
          },
        },
        required: ['decisions'],
      },
    },
  ]

  const systemPrompt = `You are an intelligent invoicing assistant for UK childminders.
Your job is to decide which invoices to generate for the previous week, handling exceptions intelligently.

Rules:
1. Generate an invoice for each child with a fixed schedule UNLESS:
   - The child's schedule_note says "term time only" and the week is a school holiday
   - The entire week is a bank holiday week (very rare)
2. Always remove bank holidays from invoice days (no childminder works bank holidays)
3. If a bank holiday falls on a scheduled day, remove that day and note it in agent_notes
4. If a child's schedule_note mentions specific exceptions (e.g. "away in August"), honour them
5. If generate=true but some days were removed, still generate but with fewer line items
6. Be conservative — when in doubt, generate the invoice (the childminder can review as a draft)

Always call decide_invoices with decisions for ALL ${children.length} children.`

  const userMessage = `Generate invoice decisions for the week of ${weekDates[0]} to ${weekDates[4]}.

Children to invoice:
${children.map(c => `
- ID: ${c.id}
  Name: ${c.first_name} ${c.last_name}
  Schedule: ${c.schedule_days.map(d => `${d.day} (${d.type} day)`).join(', ')}
  Daily rate: £${c.daily_rate}
  Half day rate: £${c.half_day_rate ?? c.daily_rate / 2}
  Schedule note: "${c.schedule_note || 'none'}"
`).join('')}

Week dates: ${weekDates.join(', ')}
Known bank holidays this week: ${bankHolidays.filter(bh => weekDates.includes(bh)).join(', ') || 'none'}

Please check for any additional context needed, then call decide_invoices with your decisions.`

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: userMessage }]

  let finalDecisions: AgentDecision[] | null = null

  // Agentic loop
  for (let turn = 0; turn < 6; turn++) {
    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      system: systemPrompt,
      tools,
      messages,
    })

    // Collect assistant message
    messages.push({ role: 'assistant', content: response.content })

    if (response.stop_reason === 'end_turn') break

    if (response.stop_reason === 'tool_use') {
      const toolResults: Anthropic.ToolResultBlockParam[] = []

      for (const block of response.content) {
        if (block.type !== 'tool_use') continue

        if (block.name === 'get_bank_holidays') {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify({ bank_holidays: bankHolidays }),
          })
        }

        if (block.name === 'check_term_time') {
          const weekStart = (block.input as { week_start: string }).week_start
          const termResult = checkTermTime(weekStart)
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(termResult),
          })
        }

        if (block.name === 'decide_invoices') {
          const input = block.input as {
            decisions: Array<{
              child_id: string
              generate: boolean
              dates_to_invoice: string[]
              skip_reason?: string
              agent_notes?: string
            }>
          }

          // Build full AgentDecision objects from agent output
          finalDecisions = input.decisions.map(d => {
            const child = children.find(c => c.id === d.child_id)!
            const lineItems: AgentLineItem[] = []

            if (d.generate && child) {
              for (const dateStr of d.dates_to_invoice) {
                const jsDate = new Date(dateStr + 'T00:00:00')
                const dayName = DAY_NAME_MAP[jsDate.getDay()]
                const scheduled = child.schedule_days.find(s => s.day === dayName)
                if (!scheduled) continue

                const dayItems = buildLineItemsForDay(dateStr, dayName, {
                  funding_type: child.funding_type,
                  funded_hours_per_day: child.funded_hours_per_day,
                  funded_days: child.funded_days,
                  hourly_rate: child.hourly_rate,
                  hours_per_day: child.hours_per_day,
                  daily_rate: child.daily_rate,
                  half_day_rate: child.half_day_rate,
                }, scheduled.type, formatDateLabel(dateStr))
                lineItems.push(...dayItems)
              }
            }

            const week_total = lineItems.filter(i => !i.is_funded).reduce((s, i) => s + i.amount, 0)

            return {
              child_id: d.child_id,
              generate: d.generate && lineItems.length > 0,
              line_items: lineItems,
              skip_reason: d.skip_reason || null,
              agent_notes: d.agent_notes || null,
              week_total,
            }
          })

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify({ status: 'decisions recorded', count: finalDecisions.length }),
          })

          // Return immediately after decisions are captured
          return finalDecisions
        }
      }

      messages.push({ role: 'user', content: toolResults })
    }
  }

  // Fallback: if agent never called decide_invoices, build basic decisions
  if (!finalDecisions) {
    finalDecisions = buildFallbackDecisions(children, weekDates, bankHolidays)
  }

  return finalDecisions
}

/**
 * Fallback logic if agent fails — pure deterministic schedule matching.
 */
export function buildFallbackDecisions(
  children: AgentChild[],
  weekDates: string[],
  bankHolidays: string[]
): AgentDecision[] {
  return children.map(child => {
    const lineItems: AgentLineItem[] = []

    for (const dateStr of weekDates) {
      if (bankHolidays.includes(dateStr)) continue
      const jsDate = new Date(dateStr + 'T00:00:00')
      const dayName = DAY_NAME_MAP[jsDate.getDay()]
      const scheduled = child.schedule_days.find(s => s.day === dayName)
      if (!scheduled) continue

      const dayItems = buildLineItemsForDay(dateStr, dayName, {
        funding_type: child.funding_type,
        funded_hours_per_day: child.funded_hours_per_day,
        funded_days: child.funded_days,
        hourly_rate: child.hourly_rate,
        hours_per_day: child.hours_per_day,
        daily_rate: child.daily_rate,
        half_day_rate: child.half_day_rate,
      }, scheduled.type, formatDateLabel(dateStr))
      lineItems.push(...dayItems)
    }

    return {
      child_id: child.id,
      generate: lineItems.length > 0,
      line_items: lineItems,
      skip_reason: lineItems.length === 0 ? 'No scheduled days in this week' : null,
      agent_notes: null,
      week_total: lineItems.filter(i => !i.is_funded).reduce((s, i) => s + i.amount, 0),
    }
  })
}

/**
 * Approximate UK England school term checker.
 * Based on typical term dates — not definitive, agent uses this as a signal.
 */
function checkTermTime(weekStart: string): { in_term: boolean; term_name?: string } {
  const date = new Date(weekStart + 'T00:00:00')
  const month = date.getMonth() + 1 // 1-12
  const day = date.getDate()

  // Summer holidays: late July – August
  if (month === 8 || (month === 7 && day >= 22)) {
    return { in_term: false, term_name: 'Summer holidays' }
  }
  // Christmas: ~Dec 20 – Jan 5
  if ((month === 12 && day >= 20) || (month === 1 && day <= 5)) {
    return { in_term: false, term_name: 'Christmas holidays' }
  }
  // Easter: ~last 2 weeks of April (rough)
  if (month === 4 && day >= 5 && day <= 25) {
    return { in_term: false, term_name: 'Easter holidays' }
  }
  // Half terms (approximate)
  if (month === 2 && day >= 17 && day <= 21) {
    return { in_term: false, term_name: 'February half term' }
  }
  if (month === 6 && day >= 26) {
    return { in_term: false, term_name: 'May/June half term' }
  }
  if (month === 10 && day >= 20 && day <= 31) {
    return { in_term: false, term_name: 'October half term' }
  }

  return { in_term: true }
}

export { fetchUKBankHolidays }
