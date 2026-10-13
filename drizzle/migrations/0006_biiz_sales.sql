-- BIIZ Sales Forces. Tables isolées par workspace (is_member). Une future couche d'import externe (agent axium) alimentera sales_accounts via source='import_axium' après contrôle ; aucune liaison directe ici.
CREATE TABLE public.sales_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  phone text, website text, city text, segment text,
  priority text CHECK (priority IN ('P0','P1','P2','P3')),
  owner_id uuid,
  source text,
  evidence text NOT NULL DEFAULT 'public' CHECK (evidence IN ('public','humain','confirme')),
  stage text NOT NULL DEFAULT 'lead' CHECK (stage IN ('lead','contacte','qualifie','r2_pris','r2_tenu','proposition','gagne','perdu')),
  amount numeric(12,2) CHECK (amount IS NULL OR amount >= 0),
  notes text,
  last_activity_at timestamptz,
  external_ref text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sales_accounts_ws_idx ON public.sales_accounts(workspace_id, stage);
CREATE INDEX sales_accounts_ws_owner_idx ON public.sales_accounts(workspace_id, owner_id);

CREATE TABLE public.sales_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.sales_accounts(id) ON DELETE CASCADE,
  name text NOT NULL, role text, phone text, email text,
  is_decision_maker boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sales_contacts_acc_idx ON public.sales_contacts(workspace_id, account_id);

CREATE TABLE public.sales_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.sales_accounts(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'appel',
  outcome text NOT NULL CHECK (outcome IN ('repondu','pas_repondu','decideur_absent','refus','r2')),
  note text CHECK (note IS NULL OR char_length(note) <= 1000),
  actor_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sales_activities_ws_idx ON public.sales_activities(workspace_id, created_at DESC);
CREATE INDEX sales_activities_acc_idx ON public.sales_activities(account_id, created_at DESC);

CREATE TABLE public.sales_next_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.sales_accounts(id) ON DELETE CASCADE,
  label text NOT NULL,
  next_action_date date NOT NULL,
  assignee_id uuid,
  done_at timestamptz,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sales_next_actions_ws_idx ON public.sales_next_actions(workspace_id, next_action_date) WHERE done_at IS NULL;

CREATE TABLE public.sales_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.sales_accounts(id) ON DELETE CASCADE,
  from_stage text, to_stage text NOT NULL,
  actor_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sales_stage_history_ws_idx ON public.sales_stage_history(workspace_id, created_at DESC);

CREATE TABLE public.sales_coach_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  advice text NOT NULL,
  next_question text, goal text, listen text,
  position integer NOT NULL DEFAULT 0,
  version integer NOT NULL DEFAULT 1,
  updated_by uuid NOT NULL DEFAULT auth.uid(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, slug)
);

CREATE TABLE public.sales_coach_card_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES public.sales_coach_cards(id) ON DELETE CASCADE,
  version integer NOT NULL,
  snapshot jsonb NOT NULL,
  actor_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sales_preferences (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  mode text NOT NULL DEFAULT 'accompagne' CHECK (mode IN ('accompagne','rapide')),
  hide_goals boolean NOT NULL DEFAULT false,
  low_stimulation boolean NOT NULL DEFAULT false,
  weekly_challenge integer CHECK (weekly_challenge IS NULL OR weekly_challenge BETWEEN 1 AND 500),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_accounts, public.sales_contacts, public.sales_next_actions, public.sales_coach_cards, public.sales_preferences TO authenticated;
GRANT SELECT, INSERT ON public.sales_activities, public.sales_stage_history, public.sales_coach_card_versions TO authenticated;
GRANT ALL ON public.sales_accounts, public.sales_contacts, public.sales_activities, public.sales_next_actions, public.sales_stage_history, public.sales_coach_cards, public.sales_coach_card_versions, public.sales_preferences TO service_role;

ALTER TABLE public.sales_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_next_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_coach_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_coach_card_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa read" ON public.sales_accounts FOR SELECT TO authenticated USING (public.is_member(workspace_id, auth.uid()));
CREATE POLICY "sa add" ON public.sales_accounts FOR INSERT TO authenticated WITH CHECK (public.is_member(workspace_id, auth.uid()) AND created_by = auth.uid());
CREATE POLICY "sa edit" ON public.sales_accounts FOR UPDATE TO authenticated USING (public.is_member(workspace_id, auth.uid())) WITH CHECK (public.is_member(workspace_id, auth.uid()));
CREATE POLICY "sa del" ON public.sales_accounts FOR DELETE TO authenticated USING (public.is_member(workspace_id, auth.uid()));

CREATE POLICY "sc read" ON public.sales_contacts FOR SELECT TO authenticated USING (public.is_member(workspace_id, auth.uid()));
CREATE POLICY "sc add" ON public.sales_contacts FOR INSERT TO authenticated WITH CHECK (public.is_member(workspace_id, auth.uid()) AND created_by = auth.uid());
CREATE POLICY "sc edit" ON public.sales_contacts FOR UPDATE TO authenticated USING (public.is_member(workspace_id, auth.uid())) WITH CHECK (public.is_member(workspace_id, auth.uid()));
CREATE POLICY "sc del" ON public.sales_contacts FOR DELETE TO authenticated USING (public.is_member(workspace_id, auth.uid()));

CREATE POLICY "sact read" ON public.sales_activities FOR SELECT TO authenticated USING (public.is_member(workspace_id, auth.uid()));
CREATE POLICY "sact add" ON public.sales_activities FOR INSERT TO authenticated WITH CHECK (public.is_member(workspace_id, auth.uid()) AND actor_id = auth.uid());

CREATE POLICY "sna read" ON public.sales_next_actions FOR SELECT TO authenticated USING (public.is_member(workspace_id, auth.uid()));
CREATE POLICY "sna add" ON public.sales_next_actions FOR INSERT TO authenticated WITH CHECK (public.is_member(workspace_id, auth.uid()) AND created_by = auth.uid());
CREATE POLICY "sna edit" ON public.sales_next_actions FOR UPDATE TO authenticated USING (public.is_member(workspace_id, auth.uid())) WITH CHECK (public.is_member(workspace_id, auth.uid()));
CREATE POLICY "sna del" ON public.sales_next_actions FOR DELETE TO authenticated USING (public.is_member(workspace_id, auth.uid()));

CREATE POLICY "ssh read" ON public.sales_stage_history FOR SELECT TO authenticated USING (public.is_member(workspace_id, auth.uid()));
CREATE POLICY "ssh add" ON public.sales_stage_history FOR INSERT TO authenticated WITH CHECK (public.is_member(workspace_id, auth.uid()) AND actor_id = auth.uid());

CREATE POLICY "scc read" ON public.sales_coach_cards FOR SELECT TO authenticated USING (public.is_member(workspace_id, auth.uid()));
CREATE POLICY "scc add" ON public.sales_coach_cards FOR INSERT TO authenticated WITH CHECK (public.is_member(workspace_id, auth.uid()) AND updated_by = auth.uid());
CREATE POLICY "scc edit" ON public.sales_coach_cards FOR UPDATE TO authenticated USING (public.is_member(workspace_id, auth.uid())) WITH CHECK (public.is_member(workspace_id, auth.uid()) AND updated_by = auth.uid());
CREATE POLICY "scc del" ON public.sales_coach_cards FOR DELETE TO authenticated USING (public.is_member(workspace_id, auth.uid()));

CREATE POLICY "sccv read" ON public.sales_coach_card_versions FOR SELECT TO authenticated USING (public.is_member(workspace_id, auth.uid()));
CREATE POLICY "sccv add" ON public.sales_coach_card_versions FOR INSERT TO authenticated WITH CHECK (public.is_member(workspace_id, auth.uid()) AND actor_id = auth.uid());

CREATE POLICY "sp own read" ON public.sales_preferences FOR SELECT TO authenticated USING (user_id = auth.uid() AND public.is_member(workspace_id, auth.uid()));
CREATE POLICY "sp own add" ON public.sales_preferences FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_member(workspace_id, auth.uid()));
CREATE POLICY "sp own edit" ON public.sales_preferences FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND public.is_member(workspace_id, auth.uid()));

-- Historique automatique (exécuté avec les droits de l'appelant : RLS s'applique)
CREATE OR REPLACE FUNCTION public.sales_track_stage() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.sales_stage_history(workspace_id, account_id, from_stage, to_stage) VALUES (NEW.workspace_id, NEW.id, NULL, NEW.stage);
  ELSIF NEW.stage IS DISTINCT FROM OLD.stage THEN
    INSERT INTO public.sales_stage_history(workspace_id, account_id, from_stage, to_stage) VALUES (NEW.workspace_id, NEW.id, OLD.stage, NEW.stage);
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.sales_touch() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
CREATE TRIGGER sales_accounts_touch BEFORE UPDATE ON public.sales_accounts FOR EACH ROW EXECUTE FUNCTION public.sales_touch();
CREATE OR REPLACE FUNCTION public.sales_track_stage_after() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.stage IS DISTINCT FROM OLD.stage THEN
    INSERT INTO public.sales_stage_history(workspace_id, account_id, from_stage, to_stage)
    VALUES (NEW.workspace_id, NEW.id, CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.stage END, NEW.stage);
  END IF;
  RETURN NULL;
END $$;
DROP FUNCTION public.sales_track_stage();
CREATE TRIGGER sales_accounts_stage AFTER INSERT OR UPDATE OF stage ON public.sales_accounts FOR EACH ROW EXECUTE FUNCTION public.sales_track_stage_after();

CREATE OR REPLACE FUNCTION public.sales_coach_version() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN NEW.version := OLD.version + 1; NEW.updated_at := now(); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER sales_coach_cards_version BEFORE UPDATE ON public.sales_coach_cards FOR EACH ROW EXECUTE FUNCTION public.sales_coach_version();
CREATE OR REPLACE FUNCTION public.sales_coach_snapshot() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  INSERT INTO public.sales_coach_card_versions(workspace_id, card_id, version, snapshot)
  VALUES (NEW.workspace_id, NEW.id, NEW.version, to_jsonb(NEW));
  RETURN NULL;
END $$;
CREATE TRIGGER sales_coach_cards_snapshot AFTER INSERT OR UPDATE ON public.sales_coach_cards FOR EACH ROW EXECUTE FUNCTION public.sales_coach_snapshot();

-- Résultat d'appel + prochaine action dans une seule transaction (droits de l'appelant)
CREATE OR REPLACE FUNCTION public.sales_log_call(_account uuid, _outcome text, _note text, _next_date date, _next_label text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE acc public.sales_accounts; act_id uuid;
BEGIN
  SELECT * INTO acc FROM public.sales_accounts WHERE id = _account;
  IF acc.id IS NULL THEN RAISE EXCEPTION 'Prospect introuvable'; END IF;
  INSERT INTO public.sales_activities(workspace_id, account_id, outcome, note)
  VALUES (acc.workspace_id, acc.id, _outcome, NULLIF(trim(_note), '')) RETURNING id INTO act_id;
  UPDATE public.sales_next_actions SET done_at = now() WHERE account_id = acc.id AND done_at IS NULL;
  IF _next_date IS NOT NULL THEN
    INSERT INTO public.sales_next_actions(workspace_id, account_id, label, next_action_date, assignee_id)
    VALUES (acc.workspace_id, acc.id, COALESCE(NULLIF(trim(_next_label), ''), 'Rappeler'), _next_date, COALESCE(acc.owner_id, auth.uid()));
  END IF;
  UPDATE public.sales_accounts SET last_activity_at = now(),
    stage = CASE
      WHEN _outcome = 'r2' AND stage IN ('lead','contacte','qualifie') THEN 'r2_pris'
      WHEN _outcome = 'refus' AND stage NOT IN ('gagne') THEN 'perdu'
      WHEN _outcome IN ('repondu','decideur_absent') AND stage = 'lead' THEN 'contacte'
      ELSE stage END
  WHERE id = acc.id;
  RETURN act_id;
END $$;
REVOKE ALL ON FUNCTION public.sales_log_call(uuid, text, text, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sales_log_call(uuid, text, text, date, text) TO authenticated;