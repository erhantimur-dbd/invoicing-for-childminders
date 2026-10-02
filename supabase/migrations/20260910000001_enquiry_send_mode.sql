-- Soft Launch send mode: auto-send or draft & approve.
-- Pause still blocks draft and send in both modes.
--
-- Do not add this column with default 'auto'. That would turn Auto-send on
-- for every existing childminder. Existing rows follow the old opt-in
-- (auto_send_replies). New signups get default 'auto' in 20260911.

alter table public.enquiry_settings
  add column if not exists send_mode text;

-- Re-running must not overwrite an explicit choice already stored.
-- auto_send_replies ships in 20260915, which is already on dormant. If this
-- file is applied before that column exists, every existing row stays approve.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'enquiry_settings'
      and column_name = 'auto_send_replies'
  ) then
    update public.enquiry_settings
    set send_mode = case
      when auto_send_replies is true then 'auto'
      else 'approve'
    end
    where send_mode is null;
  else
    update public.enquiry_settings
    set send_mode = 'approve'
    where send_mode is null;
  end if;
end $$;

-- Hold the default at approve until 20260911. If that file has already set
-- the default to auto, leave it so re-applying these files stays idempotent.
do $$
declare
  current_default text;
begin
  select column_default into current_default
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'enquiry_settings'
    and column_name = 'send_mode';

  if current_default is null or current_default not like '%''auto''%' then
    alter table public.enquiry_settings
      alter column send_mode set default 'approve';
  end if;
end $$;

alter table public.enquiry_settings
  alter column send_mode set not null;

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
