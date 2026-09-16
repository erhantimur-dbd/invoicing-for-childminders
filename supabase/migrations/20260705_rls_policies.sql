-- Captures the RLS state that exists in the live database into git so it is
-- reproducible on a fresh environment. Verified against production
-- pg_policies on 2026-07-05. Idempotent: safe to re-run.

-- Enable RLS everywhere client code touches with the anon key.
alter table public.profiles            enable row level security;
alter table public.children            enable row level security;
alter table public.invoices            enable row level security;
alter table public.invoice_line_items  enable row level security;
alter table public.invoice_sequences   enable row level security;
alter table public.expenses            enable row level security;
alter table public.bank_accounts       enable row level security;
alter table public.reminders           enable row level security;
alter table public.subscriptions       enable row level security;

-- invoice_access_attempts is server-only (service role); RLS on, no policies,
-- and not discoverable via PostgREST/GraphQL.
alter table public.invoice_access_attempts enable row level security;
revoke select on public.invoice_access_attempts from anon, authenticated;

-- Owner policies (childminder sees only their own rows).
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_own') then
    create policy profiles_own on public.profiles for all using (auth.uid() = id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'children' and policyname = 'children_own') then
    create policy children_own on public.children for all using (auth.uid() = childminder_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'invoices' and policyname = 'invoices_own') then
    create policy invoices_own on public.invoices for all using (auth.uid() = childminder_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'invoice_line_items' and policyname = 'line_items_own') then
    create policy line_items_own on public.invoice_line_items for all using (
      exists (
        select 1 from public.invoices i
        where i.id = invoice_line_items.invoice_id
          and i.childminder_id = auth.uid()
      )
    );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'invoice_sequences' and policyname = 'sequences_own') then
    create policy sequences_own on public.invoice_sequences for all using (auth.uid() = childminder_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'expenses' and policyname = 'childminder can manage own expenses') then
    create policy "childminder can manage own expenses" on public.expenses
      for all using (auth.uid() = childminder_id) with check (auth.uid() = childminder_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'bank_accounts' and policyname = 'Users manage own bank accounts') then
    create policy "Users manage own bank accounts" on public.bank_accounts
      for all using (childminder_id = auth.uid()) with check (childminder_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reminders' and policyname = 'reminders_own') then
    create policy reminders_own on public.reminders for all using (auth.uid() = childminder_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'subscriptions' and policyname = 'Users can view own subscription') then
    create policy "Users can view own subscription" on public.subscriptions
      for select using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'subscriptions' and policyname = 'Service role manages subscriptions') then
    create policy "Service role manages subscriptions" on public.subscriptions
      for all using (auth.role() = 'service_role');
  end if;
end $$;
