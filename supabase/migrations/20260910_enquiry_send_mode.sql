-- Soft Launch send mode: auto-send (default) or draft & approve.
-- Pause still blocks draft and send in both modes.

alter table public.enquiry_settings
  add column if not exists send_mode text not null default 'auto';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'enquiry_settings_send_mode_check'
  ) then
    alter table public.enquiry_settings
      add constraint enquiry_settings_send_mode_check
      check (send_mode in ('approve', 'auto'));
  end if;
end $$;
