ALTER TABLE public.workspaces ADD COLUMN app text NOT NULL DEFAULT 'marketing' CHECK (app IN ('marketing','sales'));
CREATE INDEX workspaces_app_idx ON public.workspaces(app);
COMMENT ON COLUMN public.workspaces.app IS 'Which BIIZ app owns this workspace: marketing (/app, /hadal-marketing) or sales (/sales). Apps never share workspaces.';