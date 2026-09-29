-- One Xero org connection per childminder (tokens via service role only).
-- Applied to childminder-invoicing as migration xero_connections_and_sync_ids.

create table if not exists public.xero_connections (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  tenant_id text not null,
  tenant_name text,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scopes text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.xero_connections enable row level security;

alter table public.invoices
  add column if not exists xero_invoice_id text;

alter table public.expenses
  add column if not exists xero_bill_id text;

alter table public.children
  add column if not exists xero_contact_id text;

create index if not exists invoices_xero_invoice_id_idx on public.invoices (xero_invoice_id)
  where xero_invoice_id is not null;
create index if not exists expenses_xero_bill_id_idx on public.expenses (xero_bill_id)
  where xero_bill_id is not null;
create index if not exists children_xero_contact_id_idx on public.children (xero_contact_id)
  where xero_contact_id is not null;
