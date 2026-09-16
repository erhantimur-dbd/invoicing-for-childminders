create table if not exists public.enquiry_knowledge_pending (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  prospect_id uuid references public.enquiry_prospects (id) on delete set null,
  reason text not null,
  topic text not null,
  question text not null,
  suggested_answer text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists enquiry_knowledge_pending_user_topic_pending_uidx
  on public.enquiry_knowledge_pending (user_id, topic)
  where status = 'pending';

alter table public.enquiry_knowledge_pending enable row level security;

drop policy if exists enquiry_knowledge_pending_own on public.enquiry_knowledge_pending;
create policy enquiry_knowledge_pending_own on public.enquiry_knowledge_pending
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
