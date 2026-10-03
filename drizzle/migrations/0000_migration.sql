create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create table public.links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  code text not null unique,
  name text not null,
  destination_url text not null,
  utm_source text not null,
  utm_medium text not null,
  utm_campaign text not null,
  utm_content text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
create table public.clicks (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.links(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_agent text,
  referrer text,
  created_at timestamptz not null default now()
);
create index on public.clicks(link_id, created_at);

grant select, insert, update, delete on public.workspaces, public.workspace_members, public.links to authenticated;
grant select on public.clicks to authenticated;
grant all on public.workspaces, public.workspace_members, public.links, public.clicks to service_role;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.links enable row level security;
alter table public.clicks enable row level security;

create or replace function public.is_member(_ws uuid, _user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.workspace_members where workspace_id=_ws and user_id=_user)
$$;

create or replace function public.add_creator_as_member()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.workspace_members(workspace_id, user_id) values (new.id, new.created_by);
  return new;
end $$;
create trigger ws_creator after insert on public.workspaces for each row execute function public.add_creator_as_member();

create policy "members read ws" on public.workspaces for select to authenticated using (public.is_member(id, auth.uid()) or created_by = auth.uid());
create policy "create ws" on public.workspaces for insert to authenticated with check (created_by = auth.uid());
create policy "members update ws" on public.workspaces for update to authenticated using (public.is_member(id, auth.uid()));
create policy "members read members" on public.workspace_members for select to authenticated using (public.is_member(workspace_id, auth.uid()));
create policy "members read links" on public.links for select to authenticated using (public.is_member(workspace_id, auth.uid()));
create policy "members add links" on public.links for insert to authenticated with check (public.is_member(workspace_id, auth.uid()) and created_by = auth.uid());
create policy "members edit links" on public.links for update to authenticated using (public.is_member(workspace_id, auth.uid()));
create policy "members delete links" on public.links for delete to authenticated using (public.is_member(workspace_id, auth.uid()));
create policy "members read clicks" on public.clicks for select to authenticated using (public.is_member(workspace_id, auth.uid()));