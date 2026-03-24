export type Profile = {
  id: string
  full_name: string
  email: string
  phone: string
  address_line1: string
  address_line2: string
  city: string
  postcode: string
  created_at: string
  updated_at: string
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
  created_at: string
  updated_at: string
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue'
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

export type DashboardStats = {
  totalEarnedThisMonth: number
  totalEarnedThisYear: number
  totalOutstanding: number
  unpaidCount: number
  paidThisMonth: number
  overdueCount: number
}
