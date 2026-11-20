CREATE TABLE public.bi_data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  kind text NOT NULL DEFAULT 'native' CHECK (kind IN ('native','import')),
  key_prefix text NOT NULL,
  key_hash text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  last_event_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, name)
);
CREATE INDEX bi_data_sources_workspace_idx ON public.bi_data_sources(workspace_id, created_at DESC);
CREATE INDEX bi_data_sources_key_idx ON public.bi_data_sources(key_prefix) WHERE active;
GRANT SELECT ON public.bi_data_sources TO authenticated;
GRANT ALL ON public.bi_data_sources TO service_role;
ALTER TABLE public.bi_data_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read bi sources" ON public.bi_data_sources FOR SELECT TO authenticated USING (public.is_member(workspace_id, auth.uid()));

CREATE TABLE public.bi_source_sync_state (
  source_id uuid PRIMARY KEY REFERENCES public.bi_data_sources(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  last_received_at timestamptz,
  last_success_at timestamptz,
  last_error_at timestamptz,
  last_error text,
  accepted_count bigint NOT NULL DEFAULT 0,
  duplicate_count bigint NOT NULL DEFAULT 0,
  rejected_count bigint NOT NULL DEFAULT 0
);
CREATE INDEX bi_source_sync_workspace_idx ON public.bi_source_sync_state(workspace_id, source_id);
GRANT SELECT ON public.bi_source_sync_state TO authenticated;
GRANT ALL ON public.bi_source_sync_state TO service_role;
ALTER TABLE public.bi_source_sync_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read bi sync" ON public.bi_source_sync_state FOR SELECT TO authenticated USING (public.is_member(workspace_id, auth.uid()));

CREATE TABLE public.bi_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.bi_data_sources(id) ON DELETE RESTRICT,
  event_name text NOT NULL CHECK (char_length(event_name) BETWEEN 1 AND 80),
  occurred_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  external_event_id text NOT NULL CHECK (char_length(external_event_id) BETWEEN 1 AND 160),
  customer_external_id text,
  booking_external_id text,
  location_external_id text,
  employee_external_id text,
  service_external_id text,
  session_id text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  capability text CHECK (capability IS NULL OR capability IN ('barber','wash')),
  revenue_cents bigint CHECK (revenue_cents IS NULL OR revenue_cents >= 0),
  currency text CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  UNIQUE (source_id, external_event_id)
);
CREATE INDEX bi_events_workspace_date_idx ON public.bi_events(workspace_id, occurred_at DESC);
CREATE INDEX bi_events_workspace_event_date_idx ON public.bi_events(workspace_id, event_name, occurred_at DESC);
CREATE INDEX bi_events_workspace_customer_date_idx ON public.bi_events(workspace_id, customer_external_id, occurred_at DESC) WHERE customer_external_id IS NOT NULL;
CREATE INDEX bi_events_workspace_source_date_idx ON public.bi_events(workspace_id, utm_source, occurred_at DESC) WHERE utm_source IS NOT NULL;
CREATE INDEX bi_events_workspace_booking_idx ON public.bi_events(workspace_id, booking_external_id) WHERE booking_external_id IS NOT NULL;
GRANT SELECT ON public.bi_events TO authenticated;
GRANT ALL ON public.bi_events TO service_role;
ALTER TABLE public.bi_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read bi events" ON public.bi_events FOR SELECT TO authenticated USING (public.is_member(workspace_id, auth.uid()));

CREATE TABLE public.bi_ingestion_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.bi_data_sources(id) ON DELETE CASCADE,
  external_event_id text,
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 300),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bi_ingestion_errors_workspace_date_idx ON public.bi_ingestion_errors(workspace_id, created_at DESC);
GRANT SELECT ON public.bi_ingestion_errors TO authenticated;
GRANT ALL ON public.bi_ingestion_errors TO service_role;
ALTER TABLE public.bi_ingestion_errors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read bi ingestion errors" ON public.bi_ingestion_errors FOR SELECT TO authenticated USING (public.is_member(workspace_id, auth.uid()));

CREATE TABLE public.bi_saved_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  config jsonb NOT NULL CHECK (jsonb_typeof(config) = 'object'),
  pinned boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bi_saved_analyses_workspace_idx ON public.bi_saved_analyses(workspace_id, pinned DESC, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bi_saved_analyses TO authenticated;
GRANT ALL ON public.bi_saved_analyses TO service_role;
ALTER TABLE public.bi_saved_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read bi analyses" ON public.bi_saved_analyses FOR SELECT TO authenticated USING (public.is_member(workspace_id, auth.uid()));
CREATE POLICY "writers add bi analyses" ON public.bi_saved_analyses FOR INSERT TO authenticated WITH CHECK (public.can_write(workspace_id) AND created_by = auth.uid());
CREATE POLICY "writers edit bi analyses" ON public.bi_saved_analyses FOR UPDATE TO authenticated USING (public.can_write(workspace_id)) WITH CHECK (public.can_write(workspace_id));
CREATE POLICY "editors delete bi analyses" ON public.bi_saved_analyses FOR DELETE TO authenticated USING (public.can_delete(workspace_id));

CREATE OR REPLACE FUNCTION public.bi_record_ingest(_source uuid, _accepted integer, _duplicates integer, _rejected integer, _error text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _ws uuid;
BEGIN
  SELECT workspace_id INTO _ws FROM public.bi_data_sources WHERE id = _source;
  IF _ws IS NULL THEN RAISE EXCEPTION 'unknown source'; END IF;
  INSERT INTO public.bi_source_sync_state AS s (source_id, workspace_id, last_received_at, last_success_at, last_error_at, last_error, accepted_count, duplicate_count, rejected_count)
  VALUES (_source, _ws, now(), CASE WHEN _error IS NULL THEN now() END, CASE WHEN _error IS NOT NULL THEN now() END, _error, _accepted, _duplicates, _rejected)
  ON CONFLICT (source_id) DO UPDATE SET last_received_at=now(), last_success_at=CASE WHEN _error IS NULL THEN now() ELSE s.last_success_at END,
    last_error_at=CASE WHEN _error IS NOT NULL THEN now() ELSE s.last_error_at END, last_error=_error,
    accepted_count=s.accepted_count+_accepted, duplicate_count=s.duplicate_count+_duplicates, rejected_count=s.rejected_count+_rejected;
  UPDATE public.bi_data_sources SET last_event_at=now() WHERE id=_source AND _accepted>0;
END $$;
REVOKE EXECUTE ON FUNCTION public.bi_record_ingest(uuid, integer, integer, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bi_record_ingest(uuid, integer, integer, integer, text) TO service_role;
COMMENT ON TABLE public.bi_events IS 'Événements analytiques normalisés BIIZ V2; aucune donnée personnelle directe; déduplication source + external_event_id.';