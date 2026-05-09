-- ============================================================
-- Acessos por projeto (credenciais e chaves de API)
-- ============================================================

CREATE TABLE public.project_accesses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('credential', 'api_key')),
  name        TEXT NOT NULL,
  -- type = 'credential'
  login       TEXT,
  password    TEXT,
  -- type = 'api_key'
  api_key     TEXT,
  -- comum
  url         TEXT,
  notes       TEXT,
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_accesses_project ON public.project_accesses(project_id);
ALTER TABLE public.project_accesses ENABLE ROW LEVEL SECURITY;

-- Admin: acesso total
CREATE POLICY "project_accesses_admin_all" ON public.project_accesses
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Cliente: apenas leitura nos projetos que tem acesso
CREATE POLICY "project_accesses_client_select" ON public.project_accesses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND public.user_has_client_access(p.client_id)
    )
  );

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.project_accesses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
