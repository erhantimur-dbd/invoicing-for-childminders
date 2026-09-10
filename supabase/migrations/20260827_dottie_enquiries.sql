-- Dottie Enquiries: parent-enquiry add-on on the same godottie.cloud account.
-- Does not replace invoicing subscriptions. Extra columns + new tables only.

-- ── Entitlements on the existing one-row-per-user subscriptions table ────────
alter table public.subscriptions
  add column if not exists enquiries_status text,
  add column if not exists enquiries_plan text,
  add column if not exists enquiries_stripe_subscription_id text,
  add column if not exists enquiries_current_period_end timestamptz;

create index if not exists subscriptions_enquiries_stripe_sub_idx
  on public.subscriptions (enquiries_stripe_subscription_id)
  where enquiries_stripe_subscription_id is not null;

-- ── Setting the agent speaks as ──────────────────────────────────────────────
create table if not exists public.enquiry_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  ofsted_urn text,
  postcode text,
  ages_from_months integer,
  ages_to_years integer,
  accepts_funded boolean not null default true,
  funding_schemes text[] not null default '{}',
  stretched_hours boolean not null default false,
  term_time_only boolean not null default false,
  day_rate numeric,
  hourly_rate numeric,
  quote_fees_in_email boolean not null default true,
  visiting_windows jsonb not null default '[]'::jsonb,
  agent_paused boolean not null default false,
  send_pack_on_approve boolean not null default true,
  inbound_slug text unique,
  voice_notes text,
  setup_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Spaces the agent is allowed to offer ─────────────────────────────────────
create table if not exists public.enquiry_vacancies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  weekday integer not null check (weekday between 1 and 7),
  session text not null check (session in ('full', 'half', 'school_run')),
  remaining_places integer not null default 1 check (remaining_places >= 0),
  funded boolean not null default true,
  private boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, weekday, session)
);

-- ── "Your answers" — FAQs, notes, starter-pack files ─────────────────────────
create table if not exists public.enquiry_knowledge (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('faq', 'note', 'document')),
  question text,
  answer text,
  file_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists enquiry_knowledge_user_idx
  on public.enquiry_knowledge (user_id, kind);

-- ── Parent pipeline ──────────────────────────────────────────────────────────
create table if not exists public.enquiry_prospects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  stage text not null default 'new'
    check (stage in ('new', 'chatting', 'visit', 'ready', 'started', 'lost')),
  parent_name text,
  parent_email text,
  parent_phone text,
  child_name text,
  child_dob date,
  child_age_text text,
  start_date date,
  days_needed text,
  hours_needed text,
  funding text,
  eligibility_code text,
  stretched boolean,
  sen_notes text,
  source text,
  visit_at timestamptz,
  lost_reason text,
  notes text,
  last_email_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists enquiry_prospects_user_stage_idx
  on public.enquiry_prospects (user_id, stage, created_at desc);

create table if not exists public.enquiry_messages (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.enquiry_prospects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  direction text not null check (direction in ('in', 'out', 'draft')),
  subject text,
  body text not null,
  from_address text,
  to_address text,
  status text not null default 'logged',
  model text,
  created_at timestamptz not null default now()
);

create index if not exists enquiry_messages_prospect_idx
  on public.enquiry_messages (prospect_id, created_at);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.enquiry_settings  enable row level security;
alter table public.enquiry_vacancies enable row level security;
alter table public.enquiry_knowledge enable row level security;
alter table public.enquiry_prospects enable row level security;
alter table public.enquiry_messages  enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'enquiry_settings' and policyname = 'enquiry_settings_own'
  ) then
    create policy enquiry_settings_own on public.enquiry_settings
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'enquiry_vacancies' and policyname = 'enquiry_vacancies_own'
  ) then
    create policy enquiry_vacancies_own on public.enquiry_vacancies
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'enquiry_knowledge' and policyname = 'enquiry_knowledge_own'
  ) then
    create policy enquiry_knowledge_own on public.enquiry_knowledge
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'enquiry_prospects' and policyname = 'enquiry_prospects_own'
  ) then
    create policy enquiry_prospects_own on public.enquiry_prospects
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'enquiry_messages' and policyname = 'enquiry_messages_own'
  ) then
    create policy enquiry_messages_own on public.enquiry_messages
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;
