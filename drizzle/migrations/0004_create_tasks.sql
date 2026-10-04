CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'a_faire',
  due_date date,
  location text,
  assignee_id uuid,
  content_id uuid REFERENCES public.contents(id) ON DELETE SET NULL,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read tasks" ON public.tasks FOR SELECT TO authenticated USING (public.is_member(workspace_id, auth.uid()));
CREATE POLICY "members add tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (public.is_member(workspace_id, auth.uid()) AND created_by = auth.uid());
CREATE POLICY "members edit tasks" ON public.tasks FOR UPDATE TO authenticated USING (public.is_member(workspace_id, auth.uid())) WITH CHECK (public.is_member(workspace_id, auth.uid()));
CREATE POLICY "members delete tasks" ON public.tasks FOR DELETE TO authenticated USING (public.is_member(workspace_id, auth.uid()));
CREATE INDEX tasks_ws ON public.tasks(workspace_id, due_date);