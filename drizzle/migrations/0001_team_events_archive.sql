ALTER TABLE public.links ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE TABLE public.workspace_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  invited_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, email)
);
GRANT SELECT, DELETE ON public.workspace_invites TO authenticated;
GRANT ALL ON public.workspace_invites TO service_role;
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read invites" ON public.workspace_invites FOR SELECT TO authenticated USING (public.is_member(workspace_id, auth.uid()));
CREATE POLICY "members delete invites" ON public.workspace_invites FOR DELETE TO authenticated USING (public.is_member(workspace_id, auth.uid()));

CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  link_id uuid REFERENCES public.links(id) ON DELETE SET NULL,
  first_link_id uuid REFERENCES public.links(id) ON DELETE SET NULL,
  visitor_id text,
  session_id text,
  name text NOT NULL,
  page text,
  props jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX events_ws_idx ON public.events(workspace_id, created_at);
GRANT SELECT ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read events" ON public.events FOR SELECT TO authenticated USING (public.is_member(workspace_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.invite_member(_ws uuid, _email text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid; e text := lower(trim(_email));
BEGIN
  IF NOT public.is_member(_ws, auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT id INTO uid FROM auth.users WHERE lower(email) = e LIMIT 1;
  IF uid IS NOT NULL THEN
    INSERT INTO public.workspace_members(workspace_id, user_id) VALUES (_ws, uid) ON CONFLICT DO NOTHING;
    RETURN 'added';
  END IF;
  INSERT INTO public.workspace_invites(workspace_id, email, invited_by) VALUES (_ws, e, auth.uid()) ON CONFLICT DO NOTHING;
  RETURN 'invited';
END $$;

CREATE OR REPLACE FUNCTION public.claim_invites()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e text := lower(auth.jwt() ->> 'email');
BEGIN
  IF auth.uid() IS NULL OR e IS NULL THEN RETURN; END IF;
  INSERT INTO public.workspace_members(workspace_id, user_id)
    SELECT workspace_id, auth.uid() FROM public.workspace_invites WHERE email = e ON CONFLICT DO NOTHING;
  DELETE FROM public.workspace_invites WHERE email = e;
END $$;

CREATE OR REPLACE FUNCTION public.list_members(_ws uuid)
RETURNS TABLE(user_id uuid, email text, joined_at timestamptz) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_member(_ws, auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT m.user_id, u.email::text, m.created_at FROM public.workspace_members m JOIN auth.users u ON u.id = m.user_id WHERE m.workspace_id = _ws ORDER BY m.created_at;
END $$;

CREATE OR REPLACE FUNCTION public.remove_member(_ws uuid, _user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_member(_ws, auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF (SELECT count(*) FROM public.workspace_members WHERE workspace_id = _ws) <= 1 THEN RAISE EXCEPTION 'Dernier membre'; END IF;
  DELETE FROM public.workspace_members WHERE workspace_id = _ws AND user_id = _user;
END $$;

REVOKE EXECUTE ON FUNCTION public.invite_member(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.claim_invites() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.list_members(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.remove_member(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.invite_member(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_invites() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_members(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_member(uuid, uuid) TO authenticated;