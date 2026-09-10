-- 20260506_rate_limits_and_stripe_events.sql
-- Adds shared infrastructure for two production gaps:
--   1. Distributed rate limiting (replaces the in-memory map that was a no-op on serverless)
--   2. Stripe webhook idempotency (prevents double-applying events on retry)
--
-- Apply via: supabase db push   OR   psql < this file
-- Both tables are server-only; no RLS policies are added because they're only
-- accessed via the service role key.

------------------------------------------------------------------------------
-- 1. rate_limits
------------------------------------------------------------------------------
create table if not exists public.rate_limits (
  bucket          text        not null,
  identifier      text        not null,
  window_start    timestamptz not null,
  hits            integer     not null default 1,
  primary key (bucket, identifier, window_start)
);

create index if not exists rate_limits_window_idx
  on public.rate_limits (window_start);

-- Atomic upsert+increment. Returns the new hit count. One round trip, no race.
create or replace function public.increment_rate_limit(
  p_bucket text,
  p_identifier text,
  p_window timestamptz
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hits integer;
begin
  insert into public.rate_limits (bucket, identifier, window_start, hits)
  values (p_bucket, p_identifier, p_window, 1)
  on conflict (bucket, identifier, window_start)
    do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;
  return v_hits;
end;
$$;

-- Best-effort cleanup. Schedules via pg_cron when available; otherwise
-- the rows are tiny and harmless.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'rate_limits_cleanup',
      '0 3 * * *',
      $$ delete from public.rate_limits where window_start < now() - interval '24 hours' $$
    );
  end if;
end $$;

------------------------------------------------------------------------------
-- 2. stripe_events
------------------------------------------------------------------------------
create table if not exists public.stripe_events (
  event_id      text        primary key,
  event_type    text        not null,
  received_at   timestamptz not null default now(),
  payload       jsonb
);

create index if not exists stripe_events_received_at_idx
  on public.stripe_events (received_at);

------------------------------------------------------------------------------
-- 3. children.funding_scheme
-- Identifies which 2024–25 entitlement the child is on (for invoice labelling
-- and HMRC/local-authority reporting). Existing children stay on null and
-- continue to use the legacy generic "15h"/"30h" descriptions.
------------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'children') then
    alter table public.children
      add column if not exists funding_scheme text null;

    alter table public.children
      drop constraint if exists children_funding_scheme_check;

    alter table public.children
      add constraint children_funding_scheme_check
      check (funding_scheme is null or funding_scheme in (
        '3to4_universal',
        '3to4_working',
        '2yo_disadvantaged',
        '2yo_working',
        'wp_under2',
        'wp_under5'
      ));
  end if;
end $$;

------------------------------------------------------------------------------
-- 4. invoice_line_items.category
-- Jan 2026 invoice rules require funded/paid/food/consumable/activity to be
-- itemised separately. New rows carry a category; legacy rows leave it null
-- and are bucketed by `is_funded` at render time.
------------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'invoice_line_items') then
    alter table public.invoice_line_items
      add column if not exists category text null;

    alter table public.invoice_line_items
      drop constraint if exists invoice_line_items_category_check;

    alter table public.invoice_line_items
      add constraint invoice_line_items_category_check
      check (category is null or category in (
        'funded', 'paid', 'food', 'consumable', 'activity', 'other'
      ));
  end if;
end $$;
