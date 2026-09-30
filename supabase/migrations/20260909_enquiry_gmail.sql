-- Gmail connect for Dottie Enquiries. Tokens are stored encrypted at the app
-- layer (same AES-256-GCM pattern as bank details). This does not add Outlook.

alter table public.enquiry_settings
  add column if not exists gmail_label text;

alter table public.enquiry_prospects
  add column if not exists gmail_thread_id text;

alter table public.enquiry_messages
  add column if not exists gmail_message_id text,
  add column if not exists gmail_thread_id text,
  add column if not exists rfc_message_id text;

create index if not exists enquiry_prospects_gmail_thread_idx
  on public.enquiry_prospects (user_id, gmail_thread_id)
  where gmail_thread_id is not null;

create unique index if not exists enquiry_messages_gmail_msg_uidx
  on public.enquiry_messages (user_id, gmail_message_id)
  where gmail_message_id is not null;

create table if not exists public.enquiry_gmail_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  access_token_enc text not null,
  refresh_token_enc text,
  token_expiry timestamptz,
  scopes text not null default '',
  label_id text,
  label_name text,
  history_id text,
  last_sync_at timestamptz,
  last_error text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.enquiry_gmail_accounts enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'enquiry_gmail_accounts'
      and policyname = 'enquiry_gmail_accounts_own'
  ) then
    create policy enquiry_gmail_accounts_own on public.enquiry_gmail_accounts
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;
