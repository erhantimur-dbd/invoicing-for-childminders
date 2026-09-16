export const ESCALATE_LABELS: Record<string, string>
export function parseAgeMonths(ageText?: string | null): number | null
export function decideHumanEscalation(input: {
  prospect?: Record<string, unknown>
  settings?: Record<string, unknown>
  vacancies?: { weekday: number; remaining_places: number; funded?: boolean; private?: boolean }[]
  knowledge?: { question?: string | null; answer?: string | null }[]
  parentMessage?: string
  usedAiExtract?: boolean
}): { confident: boolean; reasons: string[]; labels: string[] }
