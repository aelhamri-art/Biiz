-- BIIZ Marketing V1.1 — keep legacy kitchen missions, add lean M01 capture types
alter table public.kitchen_missions
  drop constraint if exists kitchen_missions_kind_check;

alter table public.kitchen_missions
  add constraint kitchen_missions_kind_check
  check (kind in ('pov','statique','film','operation','video_simple','story_capture'));
