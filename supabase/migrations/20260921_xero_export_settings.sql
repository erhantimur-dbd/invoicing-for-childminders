-- Persist Xero export account-code defaults on profiles.
-- Applied to childminder-invoicing (pvsiygkdprjqasdceuhm) as migration xero_export_settings.

alter table public.profiles
  add column if not exists xero_sales_account_code text,
  add column if not exists xero_default_expense_account_code text,
  add column if not exists xero_tax_type text;

comment on column public.profiles.xero_sales_account_code is
  'Xero chart-of-accounts code for childcare income (sales invoices export)';
comment on column public.profiles.xero_default_expense_account_code is
  'Fallback Xero account code for expenses without a category mapping';
comment on column public.profiles.xero_tax_type is
  'Xero tax rate display name, e.g. No VAT';
