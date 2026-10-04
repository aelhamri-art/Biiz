create table public.contents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  type text not null check (type in ('brief','script','concept','plan_tournage','rush','crea','doc')),
  title text not null,
  body text,
  status text not null default 'idee' check (status in ('idee','en_cours','a_valider','valide','publie')),
  due_date date,
  file_path text,
  file_name text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.contents to authenticated;
grant all on public.contents to service_role;

alter table public.contents enable row level security;

create policy "members read contents" on public.contents for select to authenticated using (is_member(workspace_id, auth.uid()));
create policy "members add contents" on public.contents for insert to authenticated with check (is_member(workspace_id, auth.uid()) and created_by = auth.uid());
create policy "members edit contents" on public.contents for update to authenticated using (is_member(workspace_id, auth.uid()));
create policy "members delete contents" on public.contents for delete to authenticated using (is_member(workspace_id, auth.uid()));

create policy "members read rush files" on storage.objects for select to authenticated using (bucket_id = 'rushs' and is_member((storage.foldername(name))[1]::uuid, auth.uid()));
create policy "members upload rush files" on storage.objects for insert to authenticated with check (bucket_id = 'rushs' and is_member((storage.foldername(name))[1]::uuid, auth.uid()));
create policy "members delete rush files" on storage.objects for delete to authenticated using (bucket_id = 'rushs' and is_member((storage.foldername(name))[1]::uuid, auth.uid()));