alter table public.enquiry_settings
  add column if not exists offer_waitlist boolean not null default true,
  add column if not exists template_opening text,
  add column if not exists template_closing text,
  add column if not exists include_ofsted boolean not null default false,
  add column if not exists learned_nuances jsonb not null default '[]'::jsonb;
