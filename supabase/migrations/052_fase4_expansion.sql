-- ============================================================
-- Fase 4 — Expansão: Wiki, 1:1s, OKRs, CSAT/NPS, Payment Links
-- ============================================================

-- ── WIKI ─────────────────────────────────────────────────────
CREATE TABLE public.wiki_pages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  parent_id     UUID REFERENCES public.wiki_pages(id) ON DELETE SET NULL,
  slug          TEXT NOT NULL,
  title         TEXT NOT NULL,
  content       TEXT NOT NULL DEFAULT '',
  icon          TEXT,
  created_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, slug)
);

CREATE INDEX idx_wiki_pages_workspace ON public.wiki_pages(workspace_id);
CREATE INDEX idx_wiki_pages_parent    ON public.wiki_pages(parent_id);
ALTER TABLE public.wiki_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wiki_admin_all" ON public.wiki_pages
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "wiki_member_select" ON public.wiki_pages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = wiki_pages.workspace_id
        AND user_id = auth.uid()
    )
  );

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.wiki_pages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── 1:1s (ONE-ON-ONES) ───────────────────────────────────────
CREATE TABLE public.one_on_ones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  manager_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  report_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scheduled_at    TIMESTAMPTZ,
  notes           TEXT,
  action_items    JSONB NOT NULL DEFAULT '[]',
  status          TEXT NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_one_on_ones_workspace  ON public.one_on_ones(workspace_id);
CREATE INDEX idx_one_on_ones_manager    ON public.one_on_ones(manager_id);
CREATE INDEX idx_one_on_ones_report     ON public.one_on_ones(report_id);
ALTER TABLE public.one_on_ones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "one_on_ones_admin_all" ON public.one_on_ones
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "one_on_ones_participant_select" ON public.one_on_ones FOR SELECT
  USING (manager_id = auth.uid() OR report_id = auth.uid());

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.one_on_ones
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── OKRs ─────────────────────────────────────────────────────
CREATE TABLE public.okrs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  owner_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  period        TEXT NOT NULL,          -- e.g. "2026-Q2"
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.okr_key_results (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  okr_id      UUID NOT NULL REFERENCES public.okrs(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  target      NUMERIC NOT NULL DEFAULT 100,
  current     NUMERIC NOT NULL DEFAULT 0,
  unit        TEXT NOT NULL DEFAULT '%',  -- %, pts, R$, units, etc.
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_okrs_workspace ON public.okrs(workspace_id);
CREATE INDEX idx_okr_key_results_okr ON public.okr_key_results(okr_id);
ALTER TABLE public.okrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.okr_key_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "okrs_admin_all" ON public.okrs
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "okrs_member_select" ON public.okrs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = okrs.workspace_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "okr_kr_admin_all" ON public.okr_key_results
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "okr_kr_member_select" ON public.okr_key_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.okrs o
      JOIN public.workspace_members wm ON wm.workspace_id = o.workspace_id
      WHERE o.id = okr_key_results.okr_id AND wm.user_id = auth.uid()
    )
  );

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.okrs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.okr_key_results
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── CSAT / NPS ───────────────────────────────────────────────
CREATE TABLE public.csat_responses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  client_id   UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  respondent  TEXT,                    -- nome ou email do respondente
  type        TEXT NOT NULL DEFAULT 'csat'
              CHECK (type IN ('csat', 'nps')),
  score       INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
  comment     TEXT,
  token       TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  answered_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_csat_project ON public.csat_responses(project_id);
CREATE INDEX idx_csat_client  ON public.csat_responses(client_id);
CREATE INDEX idx_csat_token   ON public.csat_responses(token);
ALTER TABLE public.csat_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "csat_admin_all" ON public.csat_responses
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Token-based public answer (via RLS bypass in service role)
-- Public endpoint will use service role key to validate + update

-- ── PAYMENT LINKS ─────────────────────────────────────────────
ALTER TABLE public.billing_milestones
  ADD COLUMN IF NOT EXISTS payment_method  TEXT
    CHECK (payment_method IN ('pix', 'boleto', 'credit_card', 'transfer', 'other')),
  ADD COLUMN IF NOT EXISTS payment_link    TEXT,
  ADD COLUMN IF NOT EXISTS payment_instructions TEXT,
  ADD COLUMN IF NOT EXISTS paid_at         TIMESTAMPTZ;

COMMENT ON COLUMN public.billing_milestones.payment_method IS 'Método de pagamento preferido';
COMMENT ON COLUMN public.billing_milestones.payment_link   IS 'Link de pagamento (Asaas, Stripe, etc.)';
COMMENT ON COLUMN public.billing_milestones.paid_at        IS 'Data de confirmação do pagamento';
