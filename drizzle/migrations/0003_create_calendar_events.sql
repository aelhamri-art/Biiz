CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'tournage',
  title text NOT NULL,
  event_date date NOT NULL,
  start_time time,
  location text,
  notes text,
  content_id uuid REFERENCES public.contents(id) ON DELETE SET NULL,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT ALL ON public.calendar_events TO service_role;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read cal" ON public.calendar_events FOR SELECT TO authenticated USING (public.is_member(workspace_id, auth.uid()));
CREATE POLICY "members add cal" ON public.calendar_events FOR INSERT TO authenticated WITH CHECK (public.is_member(workspace_id, auth.uid()) AND created_by = auth.uid());
CREATE POLICY "members edit cal" ON public.calendar_events FOR UPDATE TO authenticated USING (public.is_member(workspace_id, auth.uid())) WITH CHECK (public.is_member(workspace_id, auth.uid()));
CREATE POLICY "members delete cal" ON public.calendar_events FOR DELETE TO authenticated USING (public.is_member(workspace_id, auth.uid()));
CREATE INDEX calendar_events_ws_date ON public.calendar_events(workspace_id, event_date);