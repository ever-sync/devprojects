-- ============================================================
-- 015_execution_controls.sql
-- Fase 1.2: dependencias, riscos e capacidade operacional
-- ============================================================

CREATE TYPE public.risk_status AS ENUM (
  'open',
  'mitigating',
  'closed'
);

CREATE TYPE public.risk_level AS ENUM (
  'low',
  'medium',
  'high'
);

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS blocked_reason TEXT,
ADD COLUMN IF NOT EXISTS blocked_since TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS remaining_hours NUMERIC;

CREATE TABLE public.task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, depends_on_task_id),
  CHECK (task_id <> depends_on_task_id)
);

CREATE TABLE public.project_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status public.risk_status NOT NULL DEFAULT 'open',
  level public.risk_level NOT NULL DEFAULT 'medium',
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  mitigation_plan TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.team_capacity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  capacity_hours NUMERIC NOT NULL CHECK (capacity_hours >= 0),
  allocated_hours NUMERIC NOT NULL DEFAULT 0 CHECK (allocated_hours >= 0),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

CREATE INDEX idx_task_dependencies_task_id ON public.task_dependencies(task_id);
CREATE INDEX idx_task_dependencies_depends_on ON public.task_dependencies(depends_on_task_id);
CREATE INDEX idx_project_risks_project_id ON public.project_risks(project_id);
CREATE INDEX idx_team_capacity_user_week ON public.team_capacity(user_id, week_start);

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.project_risks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.team_capacity
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_capacity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_dependencies_admin_all" ON public.task_dependencies
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "task_dependencies_client_select" ON public.task_dependencies FOR SELECT
  USING (
    task_id IN (
      SELECT t.id
      FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE p.client_id = public.get_user_client_id()
    )
  );

CREATE POLICY "project_risks_admin_all" ON public.project_risks
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "project_risks_client_select" ON public.project_risks FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE client_id = public.get_user_client_id()
    )
  );

CREATE POLICY "team_capacity_admin_all" ON public.team_capacity
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
