export type Profile = {
  id: string
  full_name: string
  email: string
  phone: string
  address_line1: string
  address_line2: string
  city: string
  postcode: string
  // Bank details (default, used for invoices)
  default_bank_name: string
  default_bank_account_name: string
  default_bank_sort_code: string
  default_bank_account_number: string
  // Bank accounts
  primary_bank_account_id: string | null
  // Ofsted
  ofsted_number: string | null
  show_ofsted_on_invoice: boolean
  // Invoice generation
  invoice_frequency: 'weekly' | 'fortnightly' | 'monthly'
  invoice_day: string
  invoice_hour: number
  invoice_last_generated_at: string | null
  created_at: string
  updated_at: string
}

export type FundingType = 'none' | '15' | '30'

/**
 * Specific UK funded-childcare entitlement the child is on.
 *
 * Used purely for invoice labelling and reporting; the *number of hours* is
 * still controlled by `funding_type` (15 or 30) so existing data keeps working.
 *
 * Schemes (May 2026):
 *   - '3to4_universal'      Universal 15h for 3–4yo (regardless of work status)
 *   - '3to4_working'        Working-parents 30h for 3–4yo
 *   - '2yo_disadvantaged'   Disadvantaged 2yo 15h (long-standing)
 *   - '2yo_working'         Working-parents 2yo 15h (rolled out April 2024)
 *   - 'wp_under2'           Working-parents 9mo–2yo 15h (rolled out Sep 2024)
 *   - 'wp_under5'           Working-parents 9mo+ 30h (rolled out Sep 2025)
 */
export type FundingScheme =
  | '3to4_universal'
  | '3to4_working'
  | '2yo_disadvantaged'
  | '2yo_working'
  | 'wp_under2'
  | 'wp_under5'

export const FUNDING_SCHEME_LABELS: Record<FundingScheme, string> = {
  '3to4_universal': 'Universal 15h (3–4yo)',
  '3to4_working': 'Working-parents 30h (3–4yo)',
  '2yo_disadvantaged': 'Disadvantaged 2yo 15h',
  '2yo_working': 'Working-parents 2yo 15h',
  'wp_under2': 'Working-parents 9mo–2yo 15h',
  'wp_under5': 'Working-parents 9mo+ 30h',
}

export const FUNDING_SCHEME_INVOICE_LABELS: Record<FundingScheme, string> = {
  '3to4_universal': '15h universal entitlement',
  '3to4_working': '30h working-parents entitlement',
  '2yo_disadvantaged': '15h 2yo entitlement',
  '2yo_working': '15h working-parents entitlement (2yo)',
  'wp_under2': '15h working-parents entitlement (under 2)',
  'wp_under5': '30h working-parents entitlement (under 5)',
}

/**
 * Jan 2026 invoice rules categorise every line as one of these. New invoices
 * created from the auto-generator and the AI agent will populate `category`;
 * older line items leave it null and are treated as 'funded' or 'paid' by the
 * UI based on `is_funded`.
 */
export type LineItemCategory =
  | 'funded'
  | 'paid'
  | 'food'
  | 'consumable'
  | 'activity'
  | 'other'

export const LINE_ITEM_CATEGORY_LABELS: Record<LineItemCategory, string> = {
  funded: 'Funded hours',
  paid: 'Additional paid hours',
  food: 'Food',
  consumable: 'Consumables',
  activity: 'Activities & trips',
  other: 'Other',
}

export type Child = {
  id: string
  childminder_id: string
  first_name: string
  last_name: string
  date_of_birth: string | null
  parent_name: string
  parent_email: string
  parent_phone: string
  daily_rate: number
  bank_account_name: string
  bank_sort_code: string
  bank_account_number: string
  bank_name: string
  notes: string
  is_active: boolean
  half_day_rate: number | null
  hourly_rate: number | null
  hours_per_day: number | null
  schedule_days: { day: string; type: 'full' | 'half' }[] | null
  schedule_note: string | null
  funding_type: FundingType
  funding_scheme: FundingScheme | null
  funded_hours_per_day: number | null
  funded_days: string[] | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

export type BankAccount = {
  id: string
  childminder_id: string
  nickname: string
  bank_name: string
  account_name: string
  sort_code: string
  account_number: string
  created_at: string
  updated_at: string
}

export type SubscriptionTier = 'starter' | 'professional' | 'enterprise'

export type InvoiceStatus = 'draft' | 'approved' | 'sent' | 'paid' | 'overdue'
export type PaymentMethod = '' | 'stripe' | 'bank_transfer'

export type Invoice = {
  id: string
  invoice_number: string
  childminder_id: string
  child_id: string | null
  status: InvoiceStatus
  issue_date: string
  due_date: string | null
  subtotal: number
  total: number
  notes: string
  payment_method: PaymentMethod
  payment_reference: string
  paid_at: string | null
  stripe_payment_link: string
  stripe_payment_intent_id: string
  created_at: string
  updated_at: string
  children?: Child
  invoice_line_items?: InvoiceLineItem[]
}

export type InvoiceLineItem = {
  id: string
  invoice_id: string
  description: string
  care_date: string | null
  quantity: number
  unit_price: number
  amount: number
  is_funded: boolean
  category: LineItemCategory | null
  created_at: string
}

export type Reminder = {
  id: string
  invoice_id: string
  childminder_id: string
  frequency_days: number
  next_send_at: string | null
  last_sent_at: string | null
  is_active: boolean
  created_at: string
}

export type Expense = {
  id: string
  childminder_id: string
  date: string
  description: string
  category: string
  amount: number
  notes: string | null
  receipt_url: string | null
  merchant_name: string | null
  ai_extracted: boolean | null
  created_at: string
  updated_at: string
}

export const EXPENSE_CATEGORIES = [
  'Food & Drink',
  'Outings & Trips',
  "Children's Groups & Classes",
  'Arts, Crafts & Activities',
  'Books & Educational Materials',
  'Toys & Play Equipment',
  'Nappies & Consumables',
  'Travel & Transport',
  'Home & Premises',
  'Clothing & Uniforms',
  'Insurance & Professional Fees',
  'First Aid & Medical',
  'Office & Admin',
  'Other',
] as const

export const EXPENSE_CATEGORY_EMOJI: Record<string, string> = {
  'Food & Drink': '🍎',
  'Outings & Trips': '🎭',
  "Children's Groups & Classes": '👶',
  'Arts, Crafts & Activities': '🎨',
  'Books & Educational Materials': '📚',
  'Toys & Play Equipment': '🧸',
  'Nappies & Consumables': '🧴',
  'Travel & Transport': '🚗',
  'Home & Premises': '🏠',
  'Clothing & Uniforms': '👕',
  'Insurance & Professional Fees': '📋',
  'First Aid & Medical': '🏥',
  'Office & Admin': '💻',
  'Other': '📦',
}

export type DashboardStats = {
  totalEarnedThisMonth: number
  totalEarnedThisYear: number
  totalOutstanding: number
  unpaidCount: number
  paidThisMonth: number
  overdueCount: number
}
