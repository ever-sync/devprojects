-- ============================================================
-- 017_margin_tracking.sql
-- Fase 2.1: custo/hora, bill rate e margem real
-- ============================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS hour_cost NUMERIC DEFAULT 0 CHECK (hour_cost >= 0),
ADD COLUMN IF NOT EXISTS bill_rate NUMERIC DEFAULT 0 CHECK (bill_rate >= 0);

CREATE TABLE public.project_cost_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  logged_hours NUMERIC NOT NULL DEFAULT 0,
  internal_cost NUMERIC NOT NULL DEFAULT 0,
  recognized_revenue NUMERIC NOT NULL DEFAULT 0,
  gross_margin NUMERIC NOT NULL DEFAULT 0,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_project_cost_snapshots_project_id ON public.project_cost_snapshots(project_id);

ALTER TABLE public.project_cost_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_cost_snapshots_admin_all" ON public.project_cost_snapshots
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "project_cost_snapshots_client_select" ON public.project_cost_snapshots FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE client_id = public.get_user_client_id()
    )
  );
