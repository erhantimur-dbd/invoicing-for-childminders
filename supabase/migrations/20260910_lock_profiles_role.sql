-- Stop authenticated users promoting themselves to admin via profiles RLS
-- (policy profiles_own is FOR ALL on own row).

create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.role = 'admin' and coalesce(auth.role(), '') <> 'service_role' then
      raise exception 'role cannot be set by the client';
    end if;
    return new;
  end if;

  if new.role is distinct from old.role and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'role cannot be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_profile_role_change on public.profiles;
create trigger prevent_profile_role_change
  before insert or update on public.profiles
  for each row
  execute function public.prevent_profile_role_change();

-- Table-level GRANT ALL ignores REVOKE UPDATE (role). Revoke table UPDATE,
-- then re-grant every column except role.
revoke update on table public.profiles from authenticated, anon;
grant update (
  id,
  full_name,
  email,
  phone,
  address_line1,
  address_line2,
  city,
  postcode,
  created_at,
  updated_at,
  default_bank_name,
  default_bank_account_name,
  default_bank_sort_code,
  default_bank_account_number,
  onboarding_completed,
  ofsted_number,
  show_ofsted_on_invoice,
  primary_bank_account_id,
  invoice_frequency,
  invoice_day,
  invoice_last_generated_at,
  invoice_hour
) on table public.profiles to authenticated, anon;
