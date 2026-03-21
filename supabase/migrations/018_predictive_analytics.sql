-- ============================================================
-- 018_predictive_analytics.sql
-- Fase 2.2: snapshots de saude e forecast de entrega
-- ============================================================

CREATE TABLE public.project_metrics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  health_score NUMERIC NOT NULL DEFAULT 0,
  blocked_tasks_count INTEGER NOT NULL DEFAULT 0,
  pending_approvals_count INTEGER NOT NULL DEFAULT 0,
  open_risks_count INTEGER NOT NULL DEFAULT 0,
  overdue_tasks_count INTEGER NOT NULL DEFAULT 0,
  workload_alert BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.delivery_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  forecast_date DATE NOT NULL DEFAULT CURRENT_DATE,
  projected_completion_date DATE,
  projected_delay_days INTEGER NOT NULL DEFAULT 0,
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  rationale TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_project_metrics_snapshots_project_id ON public.project_metrics_snapshots(project_id);
CREATE INDEX idx_delivery_forecasts_project_id ON public.delivery_forecasts(project_id);

ALTER TABLE public.project_metrics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_metrics_snapshots_admin_all" ON public.project_metrics_snapshots
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "project_metrics_snapshots_client_select" ON public.project_metrics_snapshots FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE client_id = public.get_user_client_id()
    )
  );

CREATE POLICY "delivery_forecasts_admin_all" ON public.delivery_forecasts
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "delivery_forecasts_client_select" ON public.delivery_forecasts FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE client_id = public.get_user_client_id()
    )
  );
