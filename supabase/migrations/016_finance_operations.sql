-- ============================================================
-- 016_finance_operations.sql
-- Fase 2 inicial: contratos, marcos faturaveis e invoices
-- ============================================================

CREATE TYPE public.contract_type AS ENUM (
  'fixed',
  'retainer',
  'hour_bank',
  'sprint'
);

CREATE TYPE public.billing_milestone_status AS ENUM (
  'planned',
  'ready',
  'invoiced',
  'paid'
);

CREATE TYPE public.invoice_status AS ENUM (
  'draft',
  'issued',
  'paid',
  'overdue',
  'cancelled'
);

CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  contract_type public.contract_type NOT NULL DEFAULT 'fixed',
  total_value NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  start_date DATE,
  end_date DATE,
  billing_notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.billing_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  amount NUMERIC NOT NULL DEFAULT 0,
  status public.billing_milestone_status NOT NULL DEFAULT 'planned',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  billing_milestone_id UUID REFERENCES public.billing_milestones(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE,
  amount NUMERIC NOT NULL DEFAULT 0,
  status public.invoice_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.invoice_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('issued', 'paid', 'overdue', 'cancelled', 'note')),
  description TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contracts_project_id ON public.contracts(project_id);
CREATE INDEX idx_billing_milestones_project_id ON public.billing_milestones(project_id);
CREATE INDEX idx_invoices_project_id ON public.invoices(project_id);
CREATE INDEX idx_invoice_events_invoice_id ON public.invoice_events(invoice_id);

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.billing_milestones
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contracts_admin_all" ON public.contracts
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "contracts_client_select" ON public.contracts FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE client_id = public.get_user_client_id()
    )
  );

CREATE POLICY "billing_milestones_admin_all" ON public.billing_milestones
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "billing_milestones_client_select" ON public.billing_milestones FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE client_id = public.get_user_client_id()
    )
  );

CREATE POLICY "invoices_admin_all" ON public.invoices
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "invoices_client_select" ON public.invoices FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE client_id = public.get_user_client_id()
    )
  );

CREATE POLICY "invoice_events_admin_all" ON public.invoice_events
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "invoice_events_client_select" ON public.invoice_events FOR SELECT
  USING (
    invoice_id IN (
      SELECT i.id
      FROM public.invoices i
      JOIN public.projects p ON p.id = i.project_id
      WHERE p.client_id = public.get_user_client_id()
    )
  );
