-- Link an invoice child back to the enquiry they came from.

alter table public.children
  add column if not exists enquiry_prospect_id uuid
    references public.enquiry_prospects (id) on delete set null;

create unique index if not exists children_enquiry_prospect_id_uidx
  on public.children (enquiry_prospect_id)
  where enquiry_prospect_id is not null;
