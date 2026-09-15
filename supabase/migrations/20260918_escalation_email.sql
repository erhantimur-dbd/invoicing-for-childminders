alter table public.enquiry_prospects
  add column if not exists last_escalation_email_at timestamptz;
