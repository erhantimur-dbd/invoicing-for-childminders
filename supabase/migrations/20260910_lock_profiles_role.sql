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

revoke update (role) on public.profiles from authenticated, anon;
