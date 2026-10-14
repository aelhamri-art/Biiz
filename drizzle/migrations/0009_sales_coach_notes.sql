CREATE TABLE public.sales_coach_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  note text NOT NULL CHECK (char_length(note) BETWEEN 1 AND 600),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sales_coach_notes_ws_user_idx ON public.sales_coach_notes(workspace_id, user_id, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.sales_coach_notes TO authenticated;
GRANT ALL ON public.sales_coach_notes TO service_role;
ALTER TABLE public.sales_coach_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own coach notes read" ON public.sales_coach_notes FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.is_member(workspace_id, auth.uid()));
CREATE POLICY "own coach notes insert" ON public.sales_coach_notes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_member(workspace_id, auth.uid()));
CREATE POLICY "own coach notes delete" ON public.sales_coach_notes FOR DELETE TO authenticated
  USING (user_id = auth.uid());