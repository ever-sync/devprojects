ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS scope_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_scope_document_id
  ON public.projects(scope_document_id);
