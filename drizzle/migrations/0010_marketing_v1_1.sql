-- BIIZ Marketing V1.1 — reconcile the repository with the real production schema.
-- Idempotent by design: production already contains a first Campaigns/Distributions/roles layer.
-- Preserve all links, QR codes, clicks, events, contents and existing campaign data.

-- 1) Workspace roles and helpers ---------------------------------------------
alter table public.workspace_members add column if not exists role text;
alter table public.workspace_members alter column role set default 'contributor';
update public.workspace_members set role = 'contributor' where role is null;
alter table public.workspace_members alter column role set not null;
alter table public.workspace_members drop constraint if exists workspace_members_role_check;
alter table public.workspace_members add constraint workspace_members_role_check
  check (role in ('owner','editor','contributor','viewer'));

update public.workspace_members wm
set role='owner'
from public.workspaces w
where w.id=wm.workspace_id and w.created_by=wm.user_id;

create or replace function public.member_role(_ws uuid, _user uuid)
returns text language sql stable security definer set search_path=public
as $$ select role from public.workspace_members where workspace_id=_ws and user_id=_user $$;

create or replace function public.can_write(_ws uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select coalesce(public.member_role(_ws, auth.uid()) in ('owner','editor','contributor'), false) $$;

create or replace function public.can_delete(_ws uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select coalesce(public.member_role(_ws, auth.uid()) in ('owner','editor'), false) $$;

create or replace function public.add_creator_as_member()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  insert into public.workspace_members(workspace_id,user_id,role)
  values (new.id,new.created_by,'owner')
  on conflict (workspace_id,user_id) do update set role='owner';
  return new;
end $$;

revoke all on function public.is_member(uuid,uuid) from public, anon;
grant execute on function public.is_member(uuid,uuid) to authenticated, service_role;
revoke all on function public.member_role(uuid,uuid) from public, anon;
grant execute on function public.member_role(uuid,uuid) to authenticated, service_role;
revoke all on function public.can_write(uuid) from public, anon;
grant execute on function public.can_write(uuid) to authenticated, service_role;
revoke all on function public.can_delete(uuid) from public, anon;
grant execute on function public.can_delete(uuid) to authenticated, service_role;
revoke all on function public.add_creator_as_member() from public, anon, authenticated;
grant execute on function public.add_creator_as_member() to service_role;

-- 2) Campaigns: use the schema already present in production -----------------
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  objective text,
  target text,
  offer text,
  notes text,
  start_date date,
  end_date date,
  budget numeric(12,2),
  status text not null default 'brouillon',
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.campaigns add column if not exists objective text;
alter table public.campaigns add column if not exists target text;
alter table public.campaigns add column if not exists offer text;
alter table public.campaigns add column if not exists notes text;
alter table public.campaigns add column if not exists start_date date;
alter table public.campaigns add column if not exists end_date date;
alter table public.campaigns add column if not exists budget numeric(12,2);
alter table public.campaigns add column if not exists status text not null default 'brouillon';
alter table public.campaigns drop constraint if exists campaigns_status_check;
alter table public.campaigns add constraint campaigns_status_check
  check (status in ('brouillon','active','pause','terminee','archive'));
alter table public.campaigns drop constraint if exists campaigns_budget_check;
alter table public.campaigns add constraint campaigns_budget_check check (budget is null or budget >= 0);
create index if not exists campaigns_ws_status on public.campaigns(workspace_id,status);

grant select,insert,update,delete on public.campaigns to authenticated;
grant all on public.campaigns to service_role;
alter table public.campaigns enable row level security;
drop policy if exists "members read campaigns" on public.campaigns;
drop policy if exists "writers add campaigns" on public.campaigns;
drop policy if exists "writers edit campaigns" on public.campaigns;
drop policy if exists "editors delete campaigns" on public.campaigns;
drop policy if exists "marketing manage campaigns insert" on public.campaigns;
drop policy if exists "marketing manage campaigns update" on public.campaigns;
drop policy if exists "marketing manage campaigns delete" on public.campaigns;
create policy "members read campaigns" on public.campaigns for select to authenticated using (public.is_member(workspace_id,auth.uid()));
create policy "writers add campaigns" on public.campaigns for insert to authenticated with check (public.can_write(workspace_id) and created_by=auth.uid());
create policy "writers edit campaigns" on public.campaigns for update to authenticated using (public.can_write(workspace_id)) with check (public.can_write(workspace_id));
create policy "editors delete campaigns" on public.campaigns for delete to authenticated using (public.can_delete(workspace_id));

-- 3) Contents V2: align with the columns already present in production --------
alter table public.contents add column if not exists campaign_id uuid references public.campaigns(id) on delete set null;
alter table public.contents add column if not exists format text;
alter table public.contents add column if not exists nature text;
alter table public.contents add column if not exists platform text;
alter table public.contents add column if not exists business_objective text;
alter table public.contents add column if not exists target_summary text;
alter table public.contents add column if not exists cta text;
alter table public.contents add column if not exists caption text;
alter table public.contents add column if not exists asset_url text;
alter table public.contents add column if not exists publish_date date;
alter table public.contents add column if not exists week_label text;
alter table public.contents add column if not exists assignee_id uuid;
alter table public.contents add column if not exists link_id uuid references public.links(id) on delete set null;

alter table public.contents drop constraint if exists contents_status_check;
alter table public.contents add constraint contents_status_check
  check (status in ('idee','brief','en_creation','en_cours','a_valider','valide','programme','publie','archive'));
create index if not exists contents_campaign_idx on public.contents(campaign_id);
create index if not exists contents_ws_publish_idx on public.contents(workspace_id,publish_date);

drop policy if exists "members add contents" on public.contents;
drop policy if exists "members edit contents" on public.contents;
drop policy if exists "members delete contents" on public.contents;
drop policy if exists "writers add contents" on public.contents;
drop policy if exists "writers edit contents" on public.contents;
drop policy if exists "editors delete contents" on public.contents;
create policy "writers add contents" on public.contents for insert to authenticated with check (public.can_write(workspace_id) and created_by=auth.uid());
create policy "writers edit contents" on public.contents for update to authenticated using (public.can_write(workspace_id)) with check (public.can_write(workspace_id));
create policy "editors delete contents" on public.contents for delete to authenticated using (public.can_delete(workspace_id));

-- 4) Distributions: one content can be reused organic / paid / offline --------
create table if not exists public.distributions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  content_id uuid not null references public.contents(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  link_id uuid references public.links(id) on delete set null,
  channel text not null,
  mode text not null default 'organic',
  status text not null default 'prevu',
  published_on date,
  reach integer,
  impressions integer,
  likes integer,
  comments integer,
  shares integer,
  saves integer,
  profile_visits integer,
  clicks integer,
  notes text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.distributions add column if not exists campaign_id uuid references public.campaigns(id) on delete set null;
alter table public.distributions add column if not exists link_id uuid references public.links(id) on delete set null;
alter table public.distributions add column if not exists published_on date;
alter table public.distributions add column if not exists reach integer;
alter table public.distributions add column if not exists impressions integer;
alter table public.distributions add column if not exists likes integer;
alter table public.distributions add column if not exists comments integer;
alter table public.distributions add column if not exists shares integer;
alter table public.distributions add column if not exists saves integer;
alter table public.distributions add column if not exists profile_visits integer;
alter table public.distributions add column if not exists clicks integer;
alter table public.distributions add column if not exists notes text;
alter table public.distributions drop constraint if exists distributions_mode_check;
alter table public.distributions add constraint distributions_mode_check check (mode in ('organic','paid','offline'));
alter table public.distributions drop constraint if exists distributions_status_check;
alter table public.distributions add constraint distributions_status_check check (status in ('prevu','pret','publie','termine','archive'));
create index if not exists distributions_ws_campaign on public.distributions(workspace_id,campaign_id);
create index if not exists distributions_content on public.distributions(content_id);

grant select,insert,update,delete on public.distributions to authenticated;
grant all on public.distributions to service_role;
alter table public.distributions enable row level security;
drop policy if exists "members read distributions" on public.distributions;
drop policy if exists "writers add distributions" on public.distributions;
drop policy if exists "writers edit distributions" on public.distributions;
drop policy if exists "editors delete distributions" on public.distributions;
drop policy if exists "marketing manage distributions insert" on public.distributions;
drop policy if exists "marketing manage distributions update" on public.distributions;
drop policy if exists "marketing manage distributions delete" on public.distributions;
create policy "members read distributions" on public.distributions for select to authenticated using (public.is_member(workspace_id,auth.uid()));
create policy "writers add distributions" on public.distributions for insert to authenticated with check (public.can_write(workspace_id) and created_by=auth.uid());
create policy "writers edit distributions" on public.distributions for update to authenticated using (public.can_write(workspace_id)) with check (public.can_write(workspace_id));
create policy "editors delete distributions" on public.distributions for delete to authenticated using (public.can_delete(workspace_id));

-- 5) Paid Ads cockpit ---------------------------------------------------------
create table if not exists public.marketing_ads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  content_id uuid references public.contents(id) on delete set null,
  distribution_id uuid references public.distributions(id) on delete set null,
  platform text not null check (platform in ('meta','google','other')),
  campaign_name text not null,
  ad_group_name text,
  ad_name text,
  audience_summary text,
  budget numeric(12,2),
  spend numeric(12,2) not null default 0,
  impressions bigint not null default 0,
  reach bigint,
  clicks bigint not null default 0,
  conversions numeric(12,2) not null default 0,
  revenue numeric(12,2) not null default 0,
  start_date date,
  end_date date,
  status text not null default 'brouillon' check (status in ('brouillon','active','pause','terminee','archive')),
  learning text,
  external_id text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists marketing_ads_ws_campaign on public.marketing_ads(workspace_id,campaign_id);
grant select,insert,update,delete on public.marketing_ads to authenticated;
grant all on public.marketing_ads to service_role;
alter table public.marketing_ads enable row level security;
drop policy if exists "members read marketing ads" on public.marketing_ads;
drop policy if exists "marketing manage ads insert" on public.marketing_ads;
drop policy if exists "marketing manage ads update" on public.marketing_ads;
drop policy if exists "marketing manage ads delete" on public.marketing_ads;
create policy "members read marketing ads" on public.marketing_ads for select to authenticated using (public.is_member(workspace_id,auth.uid()));
create policy "writers add marketing ads" on public.marketing_ads for insert to authenticated with check (public.can_write(workspace_id) and created_by=auth.uid());
create policy "writers edit marketing ads" on public.marketing_ads for update to authenticated using (public.can_write(workspace_id)) with check (public.can_write(workspace_id));
create policy "editors delete marketing ads" on public.marketing_ads for delete to authenticated using (public.can_delete(workspace_id));

-- 6) Optional metrics layer for imports / external paid reporting -------------
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
  source text not null default 'manual' check (source in ('manual','meta','google','biiz','import')),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  check (campaign_id is not null or distribution_id is not null or ad_id is not null)
);
create index if not exists marketing_metrics_ws_date on public.marketing_metrics(workspace_id,metric_date);
create index if not exists marketing_metrics_campaign on public.marketing_metrics(campaign_id);
grant select,insert,update,delete on public.marketing_metrics to authenticated;
grant all on public.marketing_metrics to service_role;
alter table public.marketing_metrics enable row level security;
drop policy if exists "members read marketing metrics" on public.marketing_metrics;
drop policy if exists "marketing manage metrics insert" on public.marketing_metrics;
drop policy if exists "marketing manage metrics update" on public.marketing_metrics;
drop policy if exists "marketing manage metrics delete" on public.marketing_metrics;
create policy "members read marketing metrics" on public.marketing_metrics for select to authenticated using (public.is_member(workspace_id,auth.uid()));
create policy "writers add marketing metrics" on public.marketing_metrics for insert to authenticated with check (public.can_write(workspace_id) and created_by=auth.uid());
create policy "writers edit marketing metrics" on public.marketing_metrics for update to authenticated using (public.can_write(workspace_id)) with check (public.can_write(workspace_id));
create policy "editors delete marketing metrics" on public.marketing_metrics for delete to authenticated using (public.can_delete(workspace_id));

-- 7) Optional campaign relationship on tracked links -------------------------
alter table public.links add column if not exists campaign_id uuid references public.campaigns(id) on delete set null;
create index if not exists links_campaign_idx on public.links(campaign_id);

drop policy if exists "members add links" on public.links;
drop policy if exists "members edit links" on public.links;
drop policy if exists "members delete links" on public.links;
drop policy if exists "editors delete links" on public.links;
create policy "writers add links" on public.links for insert to authenticated with check (public.can_write(workspace_id) and created_by=auth.uid());
create policy "writers edit links" on public.links for update to authenticated using (public.can_write(workspace_id)) with check (public.can_write(workspace_id));
create policy "editors delete links" on public.links for delete to authenticated using (public.can_delete(workspace_id));

-- 8) Field collaboration: contributors can write, only editors/owners delete --
drop policy if exists "members add cal" on public.calendar_events;
drop policy if exists "members edit cal" on public.calendar_events;
drop policy if exists "members delete cal" on public.calendar_events;
create policy "writers add cal" on public.calendar_events for insert to authenticated with check (public.can_write(workspace_id) and created_by=auth.uid());
create policy "writers edit cal" on public.calendar_events for update to authenticated using (public.can_write(workspace_id)) with check (public.can_write(workspace_id));
create policy "editors delete cal" on public.calendar_events for delete to authenticated using (public.can_delete(workspace_id));

drop policy if exists "members add km" on public.kitchen_missions;
drop policy if exists "members edit km" on public.kitchen_missions;
drop policy if exists "members delete km" on public.kitchen_missions;
create policy "writers add km" on public.kitchen_missions for insert to authenticated with check (public.can_write(workspace_id) and created_by=auth.uid());
create policy "writers edit km" on public.kitchen_missions for update to authenticated using (public.can_write(workspace_id)) with check (public.can_write(workspace_id));
create policy "editors delete km" on public.kitchen_missions for delete to authenticated using (public.can_delete(workspace_id));
