-- Default for new rows is auto-send. Draft & approve stays a first-class choice.
-- Only changes the column default. Existing rows keep the 20260910 backfill
-- ('auto' only where auto_send_replies was true, otherwise 'approve').

alter table public.enquiry_settings
  alter column send_mode set default 'auto';
