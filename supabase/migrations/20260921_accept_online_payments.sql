alter table public.profiles
  add column if not exists accept_online_payments boolean not null default false;
