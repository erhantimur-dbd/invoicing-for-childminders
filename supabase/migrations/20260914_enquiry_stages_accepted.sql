-- Live DB already uses awaiting/accepted (ready was dropped). Keep new
-- environments in line so "They want to start" can persist.

alter table public.enquiry_prospects drop constraint if exists enquiry_prospects_stage_check;

update public.enquiry_prospects
  set stage = 'accepted'
  where stage = 'ready';

alter table public.enquiry_prospects
  add constraint enquiry_prospects_stage_check
  check (stage in ('new', 'chatting', 'visit', 'awaiting', 'accepted', 'started', 'lost'));
