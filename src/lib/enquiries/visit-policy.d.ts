export function parseRequestedWeekdays(daysNeeded: string | null | undefined): number[]
export function coerceVisitPolicy(value: string | null | undefined): 'accept_all' | 'match_vacancy'
export function decideVisit(input: {
  policy?: string | null
  vacancies?: { weekday: number; remaining_places: number; funded?: boolean; private?: boolean }[]
  prospect: { days_needed?: string | null; hours_needed?: string | null; start_date?: string | null; funding?: string | null }
  hasVisitingWindows: boolean
}): { mayBook: boolean; reason: string; summary: string }
export function nextVisitSlots(
  windows: { days?: string[]; start?: string; end?: string; slot_minutes?: number }[] | null | undefined,
  from?: Date,
  count?: number,
): string[]
