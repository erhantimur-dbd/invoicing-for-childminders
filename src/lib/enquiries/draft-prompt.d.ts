export const ARTICLE_50_DECISION: string
export const SEN_REDACTED: string
export function senNotesForModel(senNotes: string | null | undefined): string
export function parentBlockForModel(
  prospect: Record<string, unknown> & {
    sen_notes?: string | null
    parent_name?: string | null
    parent_email?: string | null
    child_name?: string | null
    child_age_text?: string | null
    child_dob?: string | null
    start_date?: string | null
    days_needed?: string | null
    hours_needed?: string | null
    stage?: string | null
    stageLabel?: string | null
  },
  fundingLabel: string,
): string
