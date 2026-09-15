-- Gmail ingest + Calendar write. Tokens are app-encrypted (enc:v1:).

create table if not exists public.enquiry_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('google', 'microsoft')),
  kind text not null default 'both' check (kind in ('mail', 'calendar', 'both')),
  account_email text,
  refresh_token_enc text not null,
  scopes text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'error', 'revoked')),
  history_id text,
  watch_expiry timestamptz,
  last_error text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create index if not exists enquiry_connections_user_idx
  on public.enquiry_connections (user_id, status);

alter table public.enquiry_connections enable row level security;

drop policy if exists enquiry_connections_own on public.enquiry_connections;
create policy enquiry_connections_own on public.enquiry_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.enquiry_messages
  add column if not exists provider_message_id text;

create unique index if not exists enquiry_messages_provider_uidx
  on public.enquiry_messages (user_id, provider_message_id)
  where provider_message_id is not null;

alter table public.enquiry_prospects
  add column if not exists calendar_event_id text,
  add column if not exists calendar_provider text;

alter table public.enquiry_settings
  add column if not exists auto_send_replies boolean not null default false,
  add column if not exists account_guardrails text;
