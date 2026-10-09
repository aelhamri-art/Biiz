create table public.kitchen_missions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  period_start date not null,
  scope text not null default 'semaine' check (scope in ('semaine','mois')),
  kind text not null default 'pov' check (kind in ('pov','statique','film','operation')),
  title text not null,
  pitch text,
  duration_min int,
  people text,
  plans jsonb not null default '[]'::jsonb,
  want text,
  never text,
  position int not null default 0,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.kitchen_missions to authenticated;
grant all on public.kitchen_missions to service_role;
alter table public.kitchen_missions enable row level security;
create policy "members read km" on public.kitchen_missions for select to authenticated using (is_member(workspace_id, auth.uid()));
create policy "members add km" on public.kitchen_missions for insert to authenticated with check (is_member(workspace_id, auth.uid()) and created_by = auth.uid());
create policy "members edit km" on public.kitchen_missions for update to authenticated using (is_member(workspace_id, auth.uid())) with check (is_member(workspace_id, auth.uid()));
create policy "members delete km" on public.kitchen_missions for delete to authenticated using (is_member(workspace_id, auth.uid()));
create index on public.kitchen_missions (workspace_id, period_start);

create table public.kitchen_inspirations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  url text not null check (url ~ '^https://(www\.)?instagram\.com/(p|reel)/[A-Za-z0-9_-]+/?$'),
  title text not null,
  tags text[] not null default '{}',
  takeaway text,
  why text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.kitchen_inspirations to authenticated;
grant all on public.kitchen_inspirations to service_role;
alter table public.kitchen_inspirations enable row level security;
create policy "members read ki" on public.kitchen_inspirations for select to authenticated using (is_member(workspace_id, auth.uid()));
create policy "members add ki" on public.kitchen_inspirations for insert to authenticated with check (is_member(workspace_id, auth.uid()) and created_by = auth.uid());
create policy "members edit ki" on public.kitchen_inspirations for update to authenticated using (is_member(workspace_id, auth.uid())) with check (is_member(workspace_id, auth.uid()));
create policy "members delete ki" on public.kitchen_inspirations for delete to authenticated using (is_member(workspace_id, auth.uid()));

alter table public.contents add column mission_id uuid references public.kitchen_missions(id) on delete set null;