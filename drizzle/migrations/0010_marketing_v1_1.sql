-- BIIZ Marketing V1.1
-- Additive migration: campaigns, richer contents, distributions, paid ads, metrics and workspace roles.
-- Existing links / QR / clicks / events are preserved.

-- 1) Workspace roles ---------------------------------------------------------
alter table public.workspace_members
  add column if not exists role text not null default 'contributor';

alter table public.workspace_members
  drop constraint if exists workspace_members_role_check;

alter table public.workspace_members
  add constraint workspace_members_role_check
  check (role in ('owner','editor','contributor','viewer'));

update public.workspace_members wm
set role = 'owner'
from public.workspaces w
where w.id = wm.workspace_id
  and w.created_by = wm.user_id
  and wm.role <> 'owner';

create or replace function public.has_workspace_role(_ws uuid, _user uuid, _roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = _ws
      and user_id = _user
      and role = any(_roles)
  )
$$;

-- Tighten helper execution. These functions remain callable by authenticated
-- users for RLS checks, not by anonymous/public callers.
revoke all on function public.is_member(uuid, uuid) from public, anon;
grant execute on function public.is_member(uuid, uuid) to authenticated, service_role;

revoke all on function public.has_workspace_role(uuid, uuid, text[]) from public, anon;
grant execute on function public.has_workspace_role(uuid, uuid, text[]) to authenticated, service_role;

revoke all on function public.add_creator_as_member() from public, anon, authenticated;
grant execute on function public.add_creator_as_member() to service_role;

-- Make new workspace creators owners even though role defaults to contributor.
create or replace function public.add_creator_as_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.workspace_members(workspace_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict (workspace_id, user_id)
  do update set role = 'owner';
  return new;
end
$$;

revoke all on function public.add_creator_as_member() from public, anon, authenticated;
grant execute on function public.add_creator_as_member() to service_role;

-- 2) Campaigns ---------------------------------------------------------------
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  slug text not null,
  objective text,
  status text not null default 'draft'
    check (status in ('draft','active','paused','completed','archived')),
  start_date date,
  end_date date,
  budget_planned numeric(12,2),
  target_summary text,
  offer_summary text,
  notes text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, slug)
);

create index if not exists campaigns_ws_status
  on public.campaigns(workspace_id, status);

grant select, insert, update, delete on public.campaigns to authenticated;
grant all on public.campaigns to service_role;
alter table public.campaigns enable row level security;

create policy "members read campaigns"
  on public.campaigns for select to authenticated
  using (public.is_member(workspace_id, auth.uid()));

create policy "marketing manage campaigns insert"
  on public.campaigns for insert to authenticated
  with check (
    public.has_workspace_role(workspace_id, auth.uid(), array['owner','editor'])
    and created_by = auth.uid()
  );

create policy "marketing manage campaigns update"
  on public.campaigns for update to authenticated
  using (public.has_workspace_role(workspace_id, auth.uid(), array['owner','editor']))
  with check (public.has_workspace_role(workspace_id, auth.uid(), array['owner','editor']));

create policy "marketing manage campaigns delete"
  on public.campaigns for delete to authenticated
  using (public.has_workspace_role(workspace_id, auth.uid(), array['owner','editor']));

-- 3) Contents V2 -------------------------------------------------------------
alter table public.contents add column if not exists campaign_id uuid references public.campaigns(id) on delete set null;
alter table public.contents add column if not exists format text;
alter table public.contents add column if not exists nature text;
alter table public.contents add column if not exists channel text;
alter table public.contents add column if not exists platform text;
alter table public.contents add column if not exists objective text;
alter table public.contents add column if not exists target_summary text;
alter table public.contents add column if not exists cta text;
alter table public.contents add column if not exists caption text;
alter table public.contents add column if not exists publish_at timestamptz;
alter table public.contents add column if not exists link_id uuid references public.links(id) on delete set null;
alter table public.contents add column if not exists owner_id uuid;

alter table public.contents drop constraint if exists contents_status_check;
alter table public.contents add constraint contents_status_check
  check (status in ('idee','brief','en_creation','en_cours','a_valider','valide','programme','publie','archive'));

create index if not exists contents_campaign_idx on public.contents(campaign_id);
create index if not exists contents_ws_publish_idx on public.contents(workspace_id, publish_at);

-- Replace permissive member mutation policies with role-aware policies.
drop policy if exists "members add contents" on public.contents;
drop policy if exists "members edit contents" on public.contents;
drop policy if exists "members delete contents" on public.contents;

create policy "members add contents"
  on public.contents for insert to authenticated
  with check (
    public.has_workspace_role(workspace_id, auth.uid(), array['owner','editor','contributor'])
    and created_by = auth.uid()
  );

create policy "members edit contents"
  on public.contents for update to authenticated
  using (
    public.has_workspace_role(workspace_id, auth.uid(), array['owner','editor'])
    or (created_by = auth.uid() and public.has_workspace_role(workspace_id, auth.uid(), array['contributor']))
  )
  with check (
    public.has_workspace_role(workspace_id, auth.uid(), array['owner','editor'])
    or (created_by = auth.uid() and public.has_workspace_role(workspace_id, auth.uid(), array['contributor']))
  );

create policy "members delete contents"
  on public.contents for delete to authenticated
  using (public.has_workspace_role(workspace_id, auth.uid(), array['owner','editor']));

-- 4) Distributions -----------------------------------------------------------
create table if not exists public.distributions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  content_id uuid not null references public.contents(id) on delete cascade,
  channel text not null,
  platform text,
  distribution_type text not null
    check (distribution_type in ('organic','paid','offline')),
  published_at timestamptz,
  external_id text,
  link_id uuid references public.links(id) on delete set null,
  status text not null default 'planned'
    check (status in ('planned','ready','live','paused','completed','archived')),
  notes text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists distributions_ws_campaign
  on public.distributions(workspace_id, campaign_id);
create index if not exists distributions_content
  on public.distributions(content_id);

grant select, insert, update, delete on public.distributions to authenticated;
grant all on public.distributions to service_role;
alter table public.distributions enable row level security;

create policy "members read distributions"
  on public.distributions for select to authenticated
  using (public.is_member(workspace_id, auth.uid()));
create policy "marketing manage distributions insert"
  on public.distributions for insert to authenticated
  with check (
    public.has_workspace_role(workspace_id, auth.uid(), array['owner','editor'])
    and created_by = auth.uid()
  );
create policy "marketing manage distributions update"
  on public.distributions for update to authenticated
  using (public.has_workspace_role(workspace_id, auth.uid(), array['owner','editor']))
  with check (public.has_workspace_role(workspace_id, auth.uid(), array['owner','editor']));
create policy "marketing manage distributions delete"
  on public.distributions for delete to authenticated
  using (public.has_workspace_role(workspace_id, auth.uid(), array['owner','editor']));

-- 5) Paid ads ---------------------------------------------------------------
create table if not exists public.marketing_ads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  distribution_id uuid references public.distributions(id) on delete set null,
  content_id uuid references public.contents(id) on delete set null,
  platform text not null check (platform in ('meta','google','other')),
  campaign_name text not null,
  ad_group_name text,
  ad_name text,
  audience_summary text,
  budget_planned numeric(12,2),
  spend numeric(12,2) not null default 0,
  impressions bigint not null default 0,
  reach bigint,
  clicks bigint not null default 0,
  conversions numeric(12,2) not null default 0,
  revenue numeric(12,2) not null default 0,
  start_date date,
  end_date date,
  status text not null default 'draft'
    check (status in ('draft','active','paused','completed','archived')),
  learning text,
  external_id text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists marketing_ads_ws_campaign
  on public.marketing_ads(workspace_id, campaign_id);

grant select, insert, update, delete on public.marketing_ads to authenticated;
grant all on public.marketing_ads to service_role;
alter table public.marketing_ads enable row level security;

create policy "members read marketing ads"
  on public.marketing_ads for select to authenticated
  using (public.is_member(workspace_id, auth.uid()));
create policy "marketing manage ads insert"
  on public.marketing_ads for insert to authenticated
  with check (
    public.has_workspace_role(workspace_id, auth.uid(), array['owner','editor'])
    and created_by = auth.uid()
  );
create policy "marketing manage ads update"
  on public.marketing_ads for update to authenticated
  using (public.has_workspace_role(workspace_id, auth.uid(), array['owner','editor']))
  with check (public.has_workspace_role(workspace_id, auth.uid(), array['owner','editor']));
create policy "marketing manage ads delete"
  on public.marketing_ads for delete to authenticated
  using (public.has_workspace_role(workspace_id, auth.uid(), array['owner','editor']));

-- 6) Generic manual/imported metrics ----------------------------------------
create table if not exists public.marketing_metrics (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  distribution_id uuid references public.distributions(id) on delete cascade,
  ad_id uuid references public.marketing_ads(id) on delete cascade,
  metric_date date not null default current_date,
  impressions bigint not null default 0,
  reach bigint not null default 0,
  clicks bigint not null default 0,
  conversions numeric(12,2) not null default 0,
  revenue numeric(12,2) not null default 0,
  spend numeric(12,2) not null default 0,
  likes bigint not null default 0,
  comments bigint not null default 0,
  shares bigint not null default 0,
  saves bigint not null default 0,
  profile_visits bigint not null default 0,
  source text not null default 'manual'
    check (source in ('manual','meta','google','biiz','import')),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  check (distribution_id is not null or ad_id is not null or campaign_id is not null)
);

create index if not exists marketing_metrics_ws_date
  on public.marketing_metrics(workspace_id, metric_date);
create index if not exists marketing_metrics_campaign
  on public.marketing_metrics(campaign_id);

grant select, insert, update, delete on public.marketing_metrics to authenticated;
grant all on public.marketing_metrics to service_role;
alter table public.marketing_metrics enable row level security;

create policy "members read marketing metrics"
  on public.marketing_metrics for select to authenticated
  using (public.is_member(workspace_id, auth.uid()));
create policy "marketing manage metrics insert"
  on public.marketing_metrics for insert to authenticated
  with check (
    public.has_workspace_role(workspace_id, auth.uid(), array['owner','editor'])
    and created_by = auth.uid()
  );
create policy "marketing manage metrics update"
  on public.marketing_metrics for update to authenticated
  using (public.has_workspace_role(workspace_id, auth.uid(), array['owner','editor']))
  with check (public.has_workspace_role(workspace_id, auth.uid(), array['owner','editor']));
create policy "marketing manage metrics delete"
  on public.marketing_metrics for delete to authenticated
  using (public.has_workspace_role(workspace_id, auth.uid(), array['owner','editor']));

-- 7) Link campaign object without changing existing UTM history -------------
alter table public.links add column if not exists campaign_id uuid references public.campaigns(id) on delete set null;
create index if not exists links_campaign_idx on public.links(campaign_id);

-- Only direction/editor can mutate tracking links. Everyone in the workspace
-- may still read them.
drop policy if exists "members add links" on public.links;
drop policy if exists "members edit links" on public.links;
drop policy if exists "members delete links" on public.links;

create policy "members add links"
  on public.links for insert to authenticated
  with check (
    public.has_workspace_role(workspace_id, auth.uid(), array['owner','editor'])
    and created_by = auth.uid()
  );
create policy "members edit links"
  on public.links for update to authenticated
  using (public.has_workspace_role(workspace_id, auth.uid(), array['owner','editor']))
  with check (public.has_workspace_role(workspace_id, auth.uid(), array['owner','editor']));
create policy "members delete links"
  on public.links for delete to authenticated
  using (public.has_workspace_role(workspace_id, auth.uid(), array['owner','editor']));

-- Missions are authored by marketing direction; contributors consume them.
drop policy if exists "members add km" on public.kitchen_missions;
drop policy if exists "members edit km" on public.kitchen_missions;
drop policy if exists "members delete km" on public.kitchen_missions;

create policy "members add km"
  on public.kitchen_missions for insert to authenticated
  with check (
    public.has_workspace_role(workspace_id, auth.uid(), array['owner','editor'])
    and created_by = auth.uid()
  );
create policy "members edit km"
  on public.kitchen_missions for update to authenticated
  using (public.has_workspace_role(workspace_id, auth.uid(), array['owner','editor']))
  with check (public.has_workspace_role(workspace_id, auth.uid(), array['owner','editor']));
create policy "members delete km"
  on public.kitchen_missions for delete to authenticated
  using (public.has_workspace_role(workspace_id, auth.uid(), array['owner','editor']));

-- Calendar: contributors may create/update their own field events but cannot delete.
drop policy if exists "members add cal" on public.calendar_events;
drop policy if exists "members edit cal" on public.calendar_events;
drop policy if exists "members delete cal" on public.calendar_events;

create policy "members add cal"
  on public.calendar_events for insert to authenticated
  with check (
    public.has_workspace_role(workspace_id, auth.uid(), array['owner','editor','contributor'])
    and created_by = auth.uid()
  );
create policy "members edit cal"
  on public.calendar_events for update to authenticated
  using (
    public.has_workspace_role(workspace_id, auth.uid(), array['owner','editor'])
    or (created_by = auth.uid() and public.has_workspace_role(workspace_id, auth.uid(), array['contributor']))
  )
  with check (
    public.has_workspace_role(workspace_id, auth.uid(), array['owner','editor'])
    or (created_by = auth.uid() and public.has_workspace_role(workspace_id, auth.uid(), array['contributor']))
  );
create policy "members delete cal"
  on public.calendar_events for delete to authenticated
  using (public.has_workspace_role(workspace_id, auth.uid(), array['owner','editor']));
