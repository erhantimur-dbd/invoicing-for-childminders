alter table public.enquiry_settings
  add column if not exists onboarding_style text not null default 'simple'
    check (onboarding_style in ('simple', 'comprehensive'));

alter table public.enquiry_prospects
  add column if not exists onboarding_sent_at timestamptz;
