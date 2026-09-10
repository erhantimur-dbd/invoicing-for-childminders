-- Default flipped to auto-send. Draft & approve stays a first-class choice.
-- Only changes the column default; existing explicit 'approve' rows are kept.

alter table public.enquiry_settings
  alter column send_mode set default 'auto';
