import type { FundingType } from './types'

export type LineItemInput = {
  description: string
  care_date: string
  quantity: number
  unit_price: number
  amount: number
  is_funded: boolean
}

type ChildFundingConfig = {
  funding_type: FundingType
  funded_hours_per_day: number | null
  funded_days: string[] | null
  hourly_rate: number | null
  hours_per_day: number | null
  daily_rate: number
  half_day_rate: number | null
}

/**
 * Build line items for a single care day, splitting funded and private hours
 * when the child has government funding configured.
 *
 * Returns 1 item (no funding / non-funded day) or 2 items (funded + private remainder).
 */
export function buildLineItemsForDay(
  dateStr: string,
  dayName: string,
  child: ChildFundingConfig,
  scheduledType: 'full' | 'half',
  dateLabel: string,
): LineItemInput[] {
  const isHalf = scheduledType === 'half'
  const halfRate = child.half_day_rate ?? child.daily_rate / 2
  const normalRate = isHalf ? halfRate : child.daily_rate

  // ── No funding → single normal line item ──
  if (child.funding_type === 'none') {
    return [{
      description: `Childcare${isHalf ? ' (half day)' : ''} — ${dateLabel}`,
      care_date: dateStr,
      quantity: isHalf ? 0.5 : 1,
      unit_price: isHalf ? child.daily_rate : normalRate,
      amount: normalRate,
      is_funded: false,
    }]
  }

  // ── Child has funding — is THIS day a funded day? ──
  const isFundedDay = child.funded_days
    ? child.funded_days.includes(dayName)
    : true // null funded_days = all scheduled days are funded

  if (!isFundedDay) {
    // Not a funded day → normal line item
    return [{
      description: `Childcare${isHalf ? ' (half day)' : ''} — ${dateLabel}`,
      care_date: dateStr,
      quantity: isHalf ? 0.5 : 1,
      unit_price: isHalf ? child.daily_rate : normalRate,
      amount: normalRate,
      is_funded: false,
    }]
  }

  // ── Funded day — split into funded hours + private remainder ──
  const fundedHours = child.funded_hours_per_day ?? 0
  const totalHoursThisDay = isHalf
    ? (child.hours_per_day ? child.hours_per_day / 2 : 4) // default 4hrs for half day
    : (child.hours_per_day ?? 8) // default 8hrs for full day
  const hourlyRate = child.hourly_rate ?? (child.daily_rate / (child.hours_per_day ?? 8))

  const fundingLabel = child.funding_type === '15' ? '15hrs entitlement' : '30hrs entitlement'
  const actualFunded = Math.min(fundedHours, totalHoursThisDay)
  const privateHours = Math.max(0, totalHoursThisDay - actualFunded)

  const items: LineItemInput[] = []

  // Funded line — always present on funded days
  items.push({
    description: `Funded childcare (${fundingLabel}) — ${dateLabel}`,
    care_date: dateStr,
    quantity: actualFunded,
    unit_price: 0,
    amount: 0,
    is_funded: true,
  })

  // Private remainder — only if there are hours beyond funding
  if (privateHours > 0) {
    items.push({
      description: `Childcare (private hours) — ${dateLabel}`,
      care_date: dateStr,
      quantity: privateHours,
      unit_price: hourlyRate,
      amount: Math.round(privateHours * hourlyRate * 100) / 100,
      is_funded: false,
    })
  }

  return items
}

/**
 * Format a date string (YYYY-MM-DD) into a readable label like "Monday, 28 March"
 */
export function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}
