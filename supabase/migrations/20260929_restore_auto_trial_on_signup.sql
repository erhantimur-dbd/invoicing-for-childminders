-- Restore 7-day no-card trial on signup to match product copy.
-- create_trial_subscription() already exists in production; only the trigger
-- was removed by 20260706_disable_auto_trial. This re-attaches it.

drop trigger if exists on_auth_user_created_subscription on auth.users;
drop trigger if exists trg_handle_new_user_trial on auth.users;

create trigger on_auth_user_created_subscription
  after insert on auth.users
  for each row
  execute function public.create_trial_subscription();

-- Backfill anyone currently missing a subscriptions row.
insert into public.subscriptions (user_id, status, trial_end, tier, updated_at)
select u.id, 'trialing', now() + interval '7 days', 'starter', now()
from auth.users u
left join public.subscriptions s on s.user_id = u.id
where s.user_id is null;
