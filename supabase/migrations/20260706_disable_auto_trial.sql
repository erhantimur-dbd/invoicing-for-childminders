-- 20260706_disable_auto_trial.sql
-- Trials are no longer granted automatically on signup. New users go straight
-- to paid checkout; trials are granted manually to qualified clients only
-- (see /api/admin/grant-trial).
--
-- We DROP the auto-trial trigger(s) but KEEP the trigger function so a trial
-- can be re-enabled later by simply re-creating the trigger. The profile-
-- creation trigger (handle_new_user) is left untouched.
--
-- Production auto-creates the trial via `on_auth_user_created_subscription`
-- -> create_trial_subscription(). The git-only migration 20260508 used a
-- differently-named trigger (trg_handle_new_user_trial); we drop both names
-- defensively so this migration is correct regardless of which was applied.

drop trigger if exists on_auth_user_created_subscription on auth.users;
drop trigger if exists trg_handle_new_user_trial on auth.users;

-- To re-enable auto-trials in future:
--   create trigger on_auth_user_created_subscription
--     after insert on auth.users
--     for each row execute function public.create_trial_subscription();
