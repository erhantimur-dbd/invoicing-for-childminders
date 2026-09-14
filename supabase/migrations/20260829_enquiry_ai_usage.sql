-- Monthly Enquiries AI-draft counter. Separate from rate_limits because
-- rate_limits rows older than 24h are deleted by the existing cleanup job.

create table if not exists public.enquiry_ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  period_start date not null,
  drafts integer not null default 0,
  primary key (user_id, period_start)
);

alter table public.enquiry_ai_usage enable row level security;
revoke all on public.enquiry_ai_usage from anon, authenticated;

create or replace function public.increment_enquiry_ai_usage(
  p_user uuid,
  p_period date
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_drafts integer;
begin
  insert into public.enquiry_ai_usage (user_id, period_start, drafts)
  values (p_user, p_period, 1)
  on conflict (user_id, period_start)
    do update set drafts = public.enquiry_ai_usage.drafts + 1
  returning drafts into v_drafts;
  return v_drafts;
end;
$$;

revoke all on function public.increment_enquiry_ai_usage(uuid, date) from public, anon, authenticated;
grant execute on function public.increment_enquiry_ai_usage(uuid, date) to service_role;
