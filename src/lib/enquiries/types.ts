export const ENQUIRY_STAGES = [
  'new',
  'chatting',
  'visit',
  'ready',
  'started',
  'lost',
] as const

export type EnquiryStage = (typeof ENQUIRY_STAGES)[number]

export const ENQUIRY_STAGE_LABELS: Record<EnquiryStage, string> = {
  new: 'New',
  chatting: 'Chatting',
  visit: 'Visit booked',
  ready: 'Ready to start',
  started: 'Started',
  lost: 'Not going ahead',
}

export const FUNDING_OPTIONS = [
  { id: 'unknown', label: 'Not sure yet' },
  { id: 'private', label: 'Privately funded' },
  { id: '3to4_universal', label: 'Universal 15 hours (3–4)' },
  { id: '3to4_working', label: 'Working-parent 30 hours (3–4)' },
  { id: '2yo_disadvantaged', label: '2-year-old extra support (15 hours)' },
  { id: '2yo_working', label: 'Working-parent 15/30 hours (2-year-old)' },
  { id: 'wp_under2', label: 'Working-parent hours (9 months–2 years)' },
  { id: 'wp_under5', label: 'Working-parent 30 hours (from 9 months)' },
  { id: 'tfc', label: 'Tax-Free Childcare' },
  { id: 'mixed', label: 'Mix of funded and private' },
] as const

export type FundingOptionId = (typeof FUNDING_OPTIONS)[number]['id']

export const WEEKDAYS = [
  { id: 1, key: 'monday', label: 'Mon', long: 'Monday' },
  { id: 2, key: 'tuesday', label: 'Tue', long: 'Tuesday' },
  { id: 3, key: 'wednesday', label: 'Wed', long: 'Wednesday' },
  { id: 4, key: 'thursday', label: 'Thu', long: 'Thursday' },
  { id: 5, key: 'friday', label: 'Fri', long: 'Friday' },
] as const

export type VisitingWindow = {
  days: string[]
  start: string
  end: string
  slot_minutes: number
}

export type EnquirySettings = {
  user_id: string
  display_name: string | null
  ofsted_urn: string | null
  postcode: string | null
  ages_from_months: number | null
  ages_to_years: number | null
  accepts_funded: boolean
  funding_schemes: string[]
  stretched_hours: boolean
  term_time_only: boolean
  day_rate: number | null
  hourly_rate: number | null
  quote_fees_in_email: boolean
  visiting_windows: VisitingWindow[]
  agent_paused: boolean
  send_pack_on_approve: boolean
  inbound_slug: string | null
  voice_notes: string | null
  setup_completed_at: string | null
}

export type EnquiryVacancy = {
  id: string
  user_id: string
  weekday: number
  session: 'full' | 'half' | 'school_run'
  remaining_places: number
  funded: boolean
  private: boolean
}

export type EnquiryKnowledge = {
  id: string
  user_id: string
  kind: 'faq' | 'note' | 'document'
  question: string | null
  answer: string | null
  file_name: string | null
}

export type EnquiryProspect = {
  id: string
  user_id: string
  stage: EnquiryStage
  parent_name: string | null
  parent_email: string | null
  parent_phone: string | null
  child_name: string | null
  child_dob: string | null
  child_age_text: string | null
  start_date: string | null
  days_needed: string | null
  hours_needed: string | null
  funding: string | null
  eligibility_code: string | null
  stretched: boolean | null
  sen_notes: string | null
  source: string | null
  visit_at: string | null
  lost_reason: string | null
  notes: string | null
  last_email_at: string | null
  created_at: string
  updated_at: string
}

export type EnquiryMessage = {
  id: string
  prospect_id: string
  user_id: string
  direction: 'in' | 'out' | 'draft'
  subject: string | null
  body: string
  from_address: string | null
  to_address: string | null
  status: string
  model: string | null
  created_at: string
}

export const ENQUIRIES_PRICE = {
  monthly: 19,
  annual: 190,
  annualMonthly: 15.83,
} as const
