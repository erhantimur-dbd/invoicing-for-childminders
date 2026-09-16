export function splitChildName(childName: string | null | undefined): {
  first: string
  last: string
}

export function isoDate(value: string | null | undefined): string

export function scheduleDaysFromProspect(
  daysNeeded: string | null | undefined,
): { day: string; type: 'full' }[]

export function hoursPerDayFromText(hoursNeeded: string | null | undefined): number | null

export function fundingFromEnquiry(fundingId: string | null | undefined): {
  funding_type: 'none' | '15' | '30'
  funding_scheme: string | null
}

export function fundedHoursPerDay(
  fundingType: string | null | undefined,
  dayCount: number,
): number | null

export function notesFromProspect(prospect: Record<string, unknown> | null | undefined): string

export type ChildFormPrefill = {
  first_name: string
  last_name: string
  date_of_birth: string
  parent_name: string
  parent_email: string
  parent_phone: string
  daily_rate: number
  half_day_rate: null
  hourly_rate: null
  hours_per_day: number | null
  notes: string
  schedule_days: { day: string; type: 'full' }[] | null
  schedule_note: string | null
  funding_type: 'none' | '15' | '30'
  funding_scheme: string | null
  funded_hours_per_day: number | null
  funded_days: string[] | null
  enquiry_prospect_id: string | null
}

export function childFormPrefill(prospect: Record<string, unknown> | null | undefined): ChildFormPrefill

export function addToInvoicingHref(input: {
  invoicingActive: boolean
  prospectId: string
}): string
