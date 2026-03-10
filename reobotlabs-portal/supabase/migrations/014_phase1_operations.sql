-- ============================================================
-- 014_phase1_operations.sql
-- Fase 1: governança de escopo, aprovações e apontamento de horas
-- ============================================================

CREATE TYPE public.change_request_status AS ENUM (
  'draft',
  'submitted',
  'approved',
  'rejected'
);

CREATE TYPE public.approval_status AS ENUM (
  'pending',
  'approved',
  'revision_requested'
);

CREATE TYPE public.approval_kind AS ENUM (
  'scope',
  'timeline',
  'delivery'
);

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS baseline_start_date DATE,
ADD COLUMN IF NOT EXISTS baseline_end_date DATE,
ADD COLUMN IF NOT EXISTS baseline_hours NUMERIC,
ADD COLUMN IF NOT EXISTS baseline_value NUMERIC,
ADD COLUMN IF NOT EXISTS margin_percent NUMERIC,
ADD COLUMN IF NOT EXISTS contract_value NUMERIC;

CREATE TABLE public.project_scope_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  assumptions TEXT,
  exclusions TEXT,
  dependencies TEXT,
  scope_body TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, version_number)
);

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS scope_version_current_id UUID REFERENCES public.project_scope_versions(id) ON DELETE SET NULL;

CREATE TABLE public.change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  impact_summary TEXT,
  status public.change_request_status NOT NULL DEFAULT 'draft',
  requested_deadline DATE,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.change_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_request_id UUID NOT NULL REFERENCES public.change_requests(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('scope', 'timeline', 'budget', 'hours')),
  label TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approval_kind public.approval_kind NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status public.approval_status NOT NULL DEFAULT 'pending',
  due_date DATE,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sla_due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.approval_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_id UUID NOT NULL REFERENCES public.approvals(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  details TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  hours NUMERIC NOT NULL CHECK (hours > 0),
  notes TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_project_scope_versions_project_id ON public.project_scope_versions(project_id);
CREATE INDEX idx_change_requests_project_id ON public.change_requests(project_id);
CREATE INDEX idx_approvals_project_id ON public.approvals(project_id);
CREATE INDEX idx_time_entries_project_id ON public.time_entries(project_id);
CREATE INDEX idx_time_entries_task_id ON public.time_entries(task_id);
CREATE INDEX idx_time_entries_user_id ON public.time_entries(user_id);

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.change_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.approvals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.project_scope_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scope_versions_admin_all" ON public.project_scope_versions
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "scope_versions_client_select" ON public.project_scope_versions FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE client_id = public.get_user_client_id()
    )
  );

CREATE POLICY "change_requests_admin_all" ON public.change_requests
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "change_requests_client_select" ON public.change_requests FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE client_id = public.get_user_client_id()
    )
  );

CREATE POLICY "change_request_items_admin_all" ON public.change_request_items
  USING (
    public.is_admin() OR
    change_request_id IN (
      SELECT cr.id
      FROM public.change_requests cr
      JOIN public.projects p ON p.id = cr.project_id
      WHERE p.client_id = public.get_user_client_id()
    )
  )
  WITH CHECK (public.is_admin());

CREATE POLICY "approvals_admin_all" ON public.approvals
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "approvals_client_select" ON public.approvals FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE client_id = public.get_user_client_id()
    )
  );

CREATE POLICY "approvals_client_update" ON public.approvals FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE client_id = public.get_user_client_id()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM public.projects WHERE client_id = public.get_user_client_id()
    )
  );

CREATE POLICY "approval_items_admin_all" ON public.approval_items
  USING (
    public.is_admin() OR
    approval_id IN (
      SELECT a.id
      FROM public.approvals a
      JOIN public.projects p ON p.id = a.project_id
      WHERE p.client_id = public.get_user_client_id()
    )
  )
  WITH CHECK (public.is_admin());

CREATE POLICY "time_entries_admin_all" ON public.time_entries
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "time_entries_client_select" ON public.time_entries FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE client_id = public.get_user_client_id()
    )
  );
