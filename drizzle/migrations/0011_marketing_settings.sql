-- BIIZ Marketing V1.1 — configurable workspace strategy

create table if not exists public.marketing_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  cadence jsonb not null default '{}'::jsonb,
  strategy_notes text,
  updated_by uuid not null default auth.uid(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.marketing_settings to authenticated;
grant all on public.marketing_settings to service_role;
alter table public.marketing_settings enable row level security;

create policy "members read marketing settings"
  on public.marketing_settings for select to authenticated
  using (public.is_member(workspace_id, auth.uid()));

create policy "direction insert marketing settings"
  on public.marketing_settings for insert to authenticated
  with check (
    public.has_workspace_role(workspace_id, auth.uid(), array['owner','editor'])
    and updated_by = auth.uid()
  );

create policy "direction update marketing settings"
  on public.marketing_settings for update to authenticated
  using (public.has_workspace_role(workspace_id, auth.uid(), array['owner','editor']))
  with check (public.has_workspace_role(workspace_id, auth.uid(), array['owner','editor']));

create policy "direction delete marketing settings"
  on public.marketing_settings for delete to authenticated
  using (public.has_workspace_role(workspace_id, auth.uid(), array['owner','editor']));

-- Default HADAL M01 cadence, stored in data instead of application code.
insert into public.marketing_settings (workspace_id, cadence, strategy_notes, updated_by)
select
  w.id,
  jsonb_build_object(
    'static_commercial_per_week', 1,
    'static_lifestyle_per_week', 1,
    'simple_video_per_week', 1,
    'stories_per_day_min', 2,
    'stories_per_day_max', 3,
    'video_mode', 'simple_real_product'
  ),
  'M01 : IA au maximum pour les statiques. Vidéo simple à partir de vraie matière produit / cuisine / app / restaurant. Pas de grosse production.',
  w.created_by
from public.workspaces w
where w.app = 'marketing' and lower(w.name) = 'hadal'
on conflict (workspace_id) do nothing;
