-- Partial index for the hourly reminder-chase cron: it scans for active
-- reminders whose next_send_at has passed, so index exactly that slice.
create index if not exists reminders_due_idx
  on public.reminders (next_send_at)
  where is_active = true;
