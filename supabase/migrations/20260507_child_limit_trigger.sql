-- 20260507_child_limit_trigger.sql
-- Server-side enforcement of plan child-limits.
--
-- Today, ChildForm inserts via the anon key. The plan limit is checked in
-- React (childLimit.ts) — meaning a determined user can bypass it by calling
-- Supabase REST directly. This trigger closes that hole.
--
-- Logic mirrors src/lib/childLimit.ts:
--   starter      → 5
--   professional → 20
--   enterprise   → unlimited
-- Defaults to 5 when no subscription row exists yet (e.g. trial signup
-- before Stripe webhook lands).

create or replace function public.enforce_child_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active_count integer;
  v_plan         text;
  v_limit        integer;
begin
  -- Only check on inserts that aren't already archived. Updates can move
  -- between archived/active without bumping the active count, so we check
  -- on those too — but only when archived_at goes from non-null to null
  -- (i.e. unarchive).
  if TG_OP = 'INSERT' then
    if NEW.archived_at is not null then
      return NEW;
    end if;
  elsif TG_OP = 'UPDATE' then
    if NEW.archived_at is not null or OLD.archived_at is null then
      return NEW;
    end if;
  end if;

  select plan into v_plan
  from public.subscriptions
  where user_id = NEW.childminder_id
  limit 1;

  v_limit := case coalesce(v_plan, 'starter')
    when 'starter'      then 5
    when 'professional' then 20
    when 'enterprise'   then 2147483647  -- effectively unlimited
    else 5
  end;

  select count(*) into v_active_count
  from public.children
  where childminder_id = NEW.childminder_id
    and archived_at is null
    and (TG_OP = 'INSERT' or id <> NEW.id);

  if v_active_count >= v_limit then
    raise exception 'plan_limit_reached: % plan allows up to % active children (currently %)',
      coalesce(v_plan, 'starter'), v_limit, v_active_count
      using errcode = 'P0001';
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_enforce_child_limit_insert on public.children;
create trigger trg_enforce_child_limit_insert
  before insert on public.children
  for each row
  execute function public.enforce_child_limit();

drop trigger if exists trg_enforce_child_limit_unarchive on public.children;
create trigger trg_enforce_child_limit_unarchive
  before update on public.children
  for each row
  when (OLD.archived_at is not null and NEW.archived_at is null)
  execute function public.enforce_child_limit();
