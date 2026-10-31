-- Rôles membres (défaut editor = aucun changement de droits pour l'existant)
ALTER TABLE public.workspace_members ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'editor';
UPDATE public.workspace_members m SET role = 'owner' FROM public.workspaces w WHERE w.id = m.workspace_id AND w.created_by = m.user_id;
ALTER TABLE public.workspace_members ADD CONSTRAINT workspace_members_role_check CHECK (role IN ('owner','editor','contributor','viewer'));

CREATE OR REPLACE FUNCTION public.member_role(_ws uuid, _user uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT role FROM public.workspace_members WHERE workspace_id = _ws AND user_id = _user $$;
CREATE OR REPLACE FUNCTION public.can_write(_ws uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT coalesce(public.member_role(_ws, auth.uid()) IN ('owner','editor','contributor'), false) $$;
CREATE OR REPLACE FUNCTION public.can_delete(_ws uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT coalesce(public.member_role(_ws, auth.uid()) IN ('owner','editor'), false) $$;

CREATE OR REPLACE FUNCTION public.add_creator_as_member() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ begin
  insert into public.workspace_members(workspace_id, user_id, role) values (new.id, new.created_by, 'owner');
  return new;
end $$;

CREATE OR REPLACE FUNCTION public.set_member_role(_ws uuid, _user uuid, _role text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$ BEGIN
  IF NOT public.can_delete(_ws) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _role NOT IN ('owner','editor','contributor','viewer') THEN RAISE EXCEPTION 'role invalide'; END IF;
  IF _role <> 'owner' AND (SELECT count(*) FROM public.workspace_members WHERE workspace_id=_ws AND role='owner' AND user_id<>_user) = 0
     AND public.member_role(_ws,_user) = 'owner' THEN RAISE EXCEPTION 'Dernier propriétaire'; END IF;
  UPDATE public.workspace_members SET role = _role WHERE workspace_id = _ws AND user_id = _user;
END $$;

-- Durcissement EXECUTE des SECURITY DEFINER
REVOKE EXECUTE ON FUNCTION public.is_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.add_creator_as_member() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.member_role(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_write(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_delete(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_member_role(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.invite_member(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.claim_invites() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.list_members(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.remove_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_member(uuid, uuid), public.member_role(uuid, uuid), public.can_write(uuid), public.can_delete(uuid), public.set_member_role(uuid, uuid, text) TO authenticated, service_role;

-- Cadence configurable par espace
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS cadence jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Campagnes
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  objective text, target text, offer text, notes text,
  start_date date, end_date date,
  budget numeric CHECK (budget IS NULL OR budget >= 0),
  status text NOT NULL DEFAULT 'brouillon' CHECK (status IN ('brouillon','active','pause','terminee')),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX campaigns_ws_idx ON public.campaigns(workspace_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read campaigns" ON public.campaigns FOR SELECT TO authenticated USING (public.is_member(workspace_id, auth.uid()));
CREATE POLICY "writers add campaigns" ON public.campaigns FOR INSERT TO authenticated WITH CHECK (public.can_write(workspace_id) AND created_by = auth.uid());
CREATE POLICY "writers edit campaigns" ON public.campaigns FOR UPDATE TO authenticated USING (public.can_write(workspace_id)) WITH CHECK (public.can_write(workspace_id));
CREATE POLICY "editors delete campaigns" ON public.campaigns FOR DELETE TO authenticated USING (public.can_delete(workspace_id));

-- Liens rattachables à une campagne
ALTER TABLE public.links ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL;

-- Contenus enrichis (colonnes facultatives)
ALTER TABLE public.contents
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS format text,
  ADD COLUMN IF NOT EXISTS nature text,
  ADD COLUMN IF NOT EXISTS platform text,
  ADD COLUMN IF NOT EXISTS business_objective text,
  ADD COLUMN IF NOT EXISTS target_summary text,
  ADD COLUMN IF NOT EXISTS cta text,
  ADD COLUMN IF NOT EXISTS caption text,
  ADD COLUMN IF NOT EXISTS asset_url text,
  ADD COLUMN IF NOT EXISTS publish_date date,
  ADD COLUMN IF NOT EXISTS week_label text,
  ADD COLUMN IF NOT EXISTS assignee_id uuid,
  ADD COLUMN IF NOT EXISTS link_id uuid REFERENCES public.links(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS contents_campaign_idx ON public.contents(campaign_id);

-- Diffusions : une créa, plusieurs canaux, sans duplication
CREATE TABLE public.distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  content_id uuid NOT NULL REFERENCES public.contents(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  link_id uuid REFERENCES public.links(id) ON DELETE SET NULL,
  channel text NOT NULL CHECK (channel IN ('instagram','facebook','tiktok','story','meta_ads','google_ads','offline','email','autre')),
  mode text NOT NULL DEFAULT 'organic' CHECK (mode IN ('organic','paid','offline')),
  status text NOT NULL DEFAULT 'prevu' CHECK (status IN ('prevu','publie','termine')),
  published_on date,
  reach integer, impressions integer, likes integer, comments integer, shares integer, saves integer, profile_visits integer, clicks integer,
  notes text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX distributions_ws_idx ON public.distributions(workspace_id, content_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.distributions TO authenticated;
GRANT ALL ON public.distributions TO service_role;
ALTER TABLE public.distributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read distributions" ON public.distributions FOR SELECT TO authenticated USING (public.is_member(workspace_id, auth.uid()));
CREATE POLICY "writers add distributions" ON public.distributions FOR INSERT TO authenticated WITH CHECK (public.can_write(workspace_id) AND created_by = auth.uid());
CREATE POLICY "writers edit distributions" ON public.distributions FOR UPDATE TO authenticated USING (public.can_write(workspace_id)) WITH CHECK (public.can_write(workspace_id));
CREATE POLICY "editors delete distributions" ON public.distributions FOR DELETE TO authenticated USING (public.can_delete(workspace_id));

-- Performances Ads (saisie manuelle, prêt pour sync future via external_id)
CREATE TABLE public.ad_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  content_id uuid REFERENCES public.contents(id) ON DELETE SET NULL,
  distribution_id uuid REFERENCES public.distributions(id) ON DELETE SET NULL,
  platform text NOT NULL CHECK (platform IN ('meta','google')),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('brouillon','active','pause','terminee')),
  period_start date, period_end date,
  budget numeric CHECK (budget IS NULL OR budget >= 0),
  spend numeric NOT NULL DEFAULT 0 CHECK (spend >= 0),
  impressions integer NOT NULL DEFAULT 0, reach integer NOT NULL DEFAULT 0, clicks integer NOT NULL DEFAULT 0,
  conversions integer NOT NULL DEFAULT 0, revenue numeric NOT NULL DEFAULT 0 CHECK (revenue >= 0),
  learning text,
  external_id text, synced_at timestamptz,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ad_performance_ws_idx ON public.ad_performance(workspace_id, campaign_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_performance TO authenticated;
GRANT ALL ON public.ad_performance TO service_role;
ALTER TABLE public.ad_performance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read ads" ON public.ad_performance FOR SELECT TO authenticated USING (public.is_member(workspace_id, auth.uid()));
CREATE POLICY "writers add ads" ON public.ad_performance FOR INSERT TO authenticated WITH CHECK (public.can_write(workspace_id) AND created_by = auth.uid());
CREATE POLICY "writers edit ads" ON public.ad_performance FOR UPDATE TO authenticated USING (public.can_write(workspace_id)) WITH CHECK (public.can_write(workspace_id));
CREATE POLICY "editors delete ads" ON public.ad_performance FOR DELETE TO authenticated USING (public.can_delete(workspace_id));

-- Contributeurs et lecteurs ne suppriment plus contenus et liens ; lecteurs n'écrivent plus
DROP POLICY IF EXISTS "members delete contents" ON public.contents;
CREATE POLICY "editors delete contents" ON public.contents FOR DELETE TO authenticated USING (public.can_delete(workspace_id));
DROP POLICY IF EXISTS "members delete links" ON public.links;
CREATE POLICY "editors delete links" ON public.links FOR DELETE TO authenticated USING (public.can_delete(workspace_id));
DROP POLICY IF EXISTS "members edit contents" ON public.contents;
CREATE POLICY "writers edit contents" ON public.contents FOR UPDATE TO authenticated USING (public.can_write(workspace_id)) WITH CHECK (public.can_write(workspace_id));
DROP POLICY IF EXISTS "members add contents" ON public.contents;
CREATE POLICY "writers add contents" ON public.contents FOR INSERT TO authenticated WITH CHECK (public.can_write(workspace_id) AND created_by = auth.uid());