ALTER TABLE public.contents
  ADD COLUMN IF NOT EXISTS source_id text,
  ADD COLUMN IF NOT EXISTS planned_day text,
  ADD COLUMN IF NOT EXISTS format_detail text,
  ADD COLUMN IF NOT EXISTS visual_status text,
  ADD COLUMN IF NOT EXISTS pre_publish_check text,
  ADD COLUMN IF NOT EXISTS preview_note text;
CREATE UNIQUE INDEX IF NOT EXISTS contents_ws_source_uidx ON public.contents(workspace_id, source_id) WHERE source_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.story_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  family text NOT NULL CHECK (char_length(family) BETWEEN 1 AND 40),
  objective text, real_material text, example_text text, reuse_rule text, measurement text,
  position integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, family)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_templates TO authenticated;
GRANT ALL ON public.story_templates TO service_role;
ALTER TABLE public.story_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "members read story_templates" ON public.story_templates;
DROP POLICY IF EXISTS "writers add story_templates" ON public.story_templates;
DROP POLICY IF EXISTS "writers edit story_templates" ON public.story_templates;
DROP POLICY IF EXISTS "editors delete story_templates" ON public.story_templates;
CREATE POLICY "members read story_templates" ON public.story_templates FOR SELECT TO authenticated USING (public.is_member(workspace_id, auth.uid()));
CREATE POLICY "writers add story_templates" ON public.story_templates FOR INSERT TO authenticated WITH CHECK (public.can_write(workspace_id) AND created_by = auth.uid());
CREATE POLICY "writers edit story_templates" ON public.story_templates FOR UPDATE TO authenticated USING (public.can_write(workspace_id)) WITH CHECK (public.can_write(workspace_id));
CREATE POLICY "editors delete story_templates" ON public.story_templates FOR DELETE TO authenticated USING (public.can_delete(workspace_id));

CREATE TABLE IF NOT EXISTS public.story_cycle (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  weekday text NOT NULL CHECK (char_length(weekday) BETWEEN 1 AND 20),
  story_count integer CHECK (story_count IS NULL OR story_count BETWEEN 0 AND 20),
  sequence jsonb NOT NULL DEFAULT '[]'::jsonb,
  copy_material text, notes text,
  position integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, weekday)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_cycle TO authenticated;
GRANT ALL ON public.story_cycle TO service_role;
ALTER TABLE public.story_cycle ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "members read story_cycle" ON public.story_cycle;
DROP POLICY IF EXISTS "writers add story_cycle" ON public.story_cycle;
DROP POLICY IF EXISTS "writers edit story_cycle" ON public.story_cycle;
DROP POLICY IF EXISTS "editors delete story_cycle" ON public.story_cycle;
CREATE POLICY "members read story_cycle" ON public.story_cycle FOR SELECT TO authenticated USING (public.is_member(workspace_id, auth.uid()));
CREATE POLICY "writers add story_cycle" ON public.story_cycle FOR INSERT TO authenticated WITH CHECK (public.can_write(workspace_id) AND created_by = auth.uid());
CREATE POLICY "writers edit story_cycle" ON public.story_cycle FOR UPDATE TO authenticated USING (public.can_write(workspace_id)) WITH CHECK (public.can_write(workspace_id));
CREATE POLICY "editors delete story_cycle" ON public.story_cycle FOR DELETE TO authenticated USING (public.can_delete(workspace_id));

CREATE TABLE IF NOT EXISTS public.shooting_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  content_id uuid REFERENCES public.contents(id) ON DELETE SET NULL,
  source_id text,
  concept text NOT NULL CHECK (char_length(concept) BETWEEN 1 AND 200),
  duration_label text,
  shots jsonb NOT NULL DEFAULT '[]'::jsonb,
  overlay_text text, material_editing text, reuse_note text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS shooting_briefs_ws_source_uidx ON public.shooting_briefs(workspace_id, source_id) WHERE source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS shooting_briefs_content_idx ON public.shooting_briefs(content_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shooting_briefs TO authenticated;
GRANT ALL ON public.shooting_briefs TO service_role;
ALTER TABLE public.shooting_briefs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "members read shooting_briefs" ON public.shooting_briefs;
DROP POLICY IF EXISTS "writers add shooting_briefs" ON public.shooting_briefs;
DROP POLICY IF EXISTS "writers edit shooting_briefs" ON public.shooting_briefs;
DROP POLICY IF EXISTS "editors delete shooting_briefs" ON public.shooting_briefs;
CREATE POLICY "members read shooting_briefs" ON public.shooting_briefs FOR SELECT TO authenticated USING (public.is_member(workspace_id, auth.uid()));
CREATE POLICY "writers add shooting_briefs" ON public.shooting_briefs FOR INSERT TO authenticated WITH CHECK (public.can_write(workspace_id) AND created_by = auth.uid());
CREATE POLICY "writers edit shooting_briefs" ON public.shooting_briefs FOR UPDATE TO authenticated USING (public.can_write(workspace_id)) WITH CHECK (public.can_write(workspace_id));
CREATE POLICY "editors delete shooting_briefs" ON public.shooting_briefs FOR DELETE TO authenticated USING (public.can_delete(workspace_id));