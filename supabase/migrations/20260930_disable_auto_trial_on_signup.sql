-- Trials are no longer granted automatically on signup. New users go to paid
-- checkout or book a demo; discretionary trials via /api/admin/grant-trial.
--
-- Keep create_trial_subscription() so a trial can be re-enabled later by
-- recreating the trigger. Profile-creation trigger is untouched.

drop trigger if exists on_auth_user_created_subscription on auth.users;
drop trigger if exists trg_handle_new_user_trial on auth.users;
