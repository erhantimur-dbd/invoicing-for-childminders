-- 20260508_handle_new_user_trial.sql
-- Auto-creates a 7-day trial subscription row on signup, so the homepage
-- promise ("Start your free 7-day trial — no credit card required") is true.
--
-- Before this migration:
--   * Signup created NO subscriptions row.
--   * After onboarding, the dashboard redirected the user to /subscribe.
--   * Trial banner on /subscribe was a lie — no trial actually existed.
--   * Card was required at Stripe Checkout to gain dashboard access.
--
-- After:
--   * Every new auth.users row gets a paired subscriptions row with
--     status='trialing', trial_end = now() + 7 days, no Stripe customer.
--   * Stripe Checkout (when the user picks a plan) attaches stripe_customer_id
--     and stripe_subscription_id to the existing row, and the webhook flips
--     status to 'trialing' (Stripe-driven) and writes trial_end from Stripe.
--   * Onboarding → dashboard works without a card.

------------------------------------------------------------------------------
-- 1. Trigger function — fires after a user is inserted into auth.users
------------------------------------------------------------------------------
create or replace function public.handle_new_user_trial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Idempotent: don't overwrite an existing row (covers re-runs, signups via
  -- service-role tooling, OAuth re-links).
  insert into public.subscriptions (user_id, status, trial_end, plan, updated_at)
  values (NEW.id, 'trialing', now() + interval '7 days', null, now())
  on conflict (user_id) do nothing;
  return NEW;
end;
$$;

drop trigger if exists trg_handle_new_user_trial on auth.users;
create trigger trg_handle_new_user_trial
  after insert on auth.users
  for each row
  execute function public.handle_new_user_trial();

------------------------------------------------------------------------------
-- 2. Backfill — every existing auth.users row that has no subscriptions row
--    gets a fresh 7-day trial starting now. This rescues anyone signed up
--    before the trigger landed.
------------------------------------------------------------------------------
insert into public.subscriptions (user_id, status, trial_end, plan, updated_at)
select u.id, 'trialing', now() + interval '7 days', null, now()
from auth.users u
left join public.subscriptions s on s.user_id = u.id
where s.user_id is null;
