alter table public.enquiry_prospects
  add column if not exists needs_human boolean not null default false,
  add column if not exists escalate_reasons text[] not null default '{}';
