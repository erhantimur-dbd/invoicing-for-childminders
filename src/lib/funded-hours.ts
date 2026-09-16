import { FUNDING_SCHEME_INVOICE_LABELS, type FundingScheme, type FundingType, type LineItemCategory } from './types'

export type LineItemInput = {
  description: string
  care_date: string
  quantity: number
  unit_price: number
  amount: number
  is_funded: boolean
  category: LineItemCategory
}

type ChildFundingConfig = {
  funding_type: FundingType
  funding_scheme?: FundingScheme | null
  funded_hours_per_day: number | null
  funded_days: string[] | null
  hourly_rate: number | null
  hours_per_day: number | null
  daily_rate: number
  half_day_rate: number | null
}

function fundingDescription(config: ChildFundingConfig): string {
  if (config.funding_scheme) {
    return FUNDING_SCHEME_INVOICE_LABELS[config.funding_scheme]
  }
  // Legacy fallback
  return config.funding_type === '15' ? '15hrs entitlement' : '30hrs entitlement'
}

/**
 * Build line items for a single care day, splitting funded and private hours
 * when the child has government funding configured.
 *
 * Returns 1 item (no funding / non-funded day) or 2 items (funded + private remainder).
 *
 * Categories are tagged per Jan 2026 invoice rules — funded vs. paid is
 * captured here; food / consumables / activities are added by the caller as
 * separate line items, never bundled into the care line.
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

  // ── No funding → single paid line item ──
  if (child.funding_type === 'none') {
    return [{
      description: `Childcare${isHalf ? ' (half day)' : ''} — ${dateLabel}`,
      care_date: dateStr,
      quantity: isHalf ? 0.5 : 1,
      unit_price: isHalf ? child.daily_rate : normalRate,
      amount: normalRate,
      is_funded: false,
      category: 'paid',
    }]
  }

  const isFundedDay = child.funded_days
    ? child.funded_days.includes(dayName)
    : true

  if (!isFundedDay) {
    return [{
      description: `Childcare${isHalf ? ' (half day)' : ''} — ${dateLabel}`,
      care_date: dateStr,
      quantity: isHalf ? 0.5 : 1,
      unit_price: isHalf ? child.daily_rate : normalRate,
      amount: normalRate,
      is_funded: false,
      category: 'paid',
    }]
  }

  // ── Funded day — split into funded hours + private remainder ──
  const fundedHours = child.funded_hours_per_day ?? 0
  const totalHoursThisDay = isHalf
    ? (child.hours_per_day ? child.hours_per_day / 2 : 4)
    : (child.hours_per_day ?? 8)
  const hourlyRate = child.hourly_rate ?? (child.daily_rate / (child.hours_per_day ?? 8))

  const actualFunded = Math.min(fundedHours, totalHoursThisDay)
  const privateHours = Math.max(0, totalHoursThisDay - actualFunded)
  const fundingLabel = fundingDescription(child)

  const items: LineItemInput[] = []

  // Funded hours — always shown explicitly at £0 per Jan 2026 rules.
  items.push({
    description: `Funded childcare (${fundingLabel}) — ${dateLabel}`,
    care_date: dateStr,
    quantity: actualFunded,
    unit_price: 0,
    amount: 0,
    is_funded: true,
    category: 'funded',
  })

  // Additional paid hours — separate line, at the normal hourly rate, NOT
  // conditional on the funded place.
  if (privateHours > 0) {
    items.push({
      description: `Additional paid hours — ${dateLabel}`,
      care_date: dateStr,
      quantity: privateHours,
      unit_price: hourlyRate,
      amount: Math.round(privateHours * hourlyRate * 100) / 100,
      is_funded: false,
      category: 'paid',
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
