-- ============================================================
-- 024_billing_foundation.sql
-- Base SaaS: planos e assinaturas por workspace
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'subscription_status'
  ) THEN
    CREATE TYPE public.subscription_status AS ENUM (
      'trialing',
      'active',
      'past_due',
      'canceled'
    );
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly_brl NUMERIC NOT NULL DEFAULT 0,
  project_limit INTEGER,
  member_limit INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  status public.subscription_status NOT NULL DEFAULT 'active',
  seats INTEGER NOT NULL DEFAULT 5 CHECK (seats > 0),
  current_period_start DATE NOT NULL DEFAULT CURRENT_DATE,
  current_period_end DATE,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  external_customer_id TEXT,
  external_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace_id ON public.subscriptions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON public.subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

DROP TRIGGER IF EXISTS handle_updated_at_plans ON public.plans;
CREATE TRIGGER handle_updated_at_plans BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at_subscriptions ON public.subscriptions;
CREATE TRIGGER handle_updated_at_subscriptions BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

INSERT INTO public.plans (key, name, description, price_monthly_brl, project_limit, member_limit)
VALUES
  ('starter', 'Starter', 'Base para operacao enxuta com poucos clientes.', 497, 10, 5),
  ('growth', 'Growth', 'Plano para agencias em expansao com mais equipe e carteira.', 1297, 30, 15),
  ('scale', 'Scale', 'Plano para operacao com multiplos squads e governanca ampliada.', 2997, NULL, NULL)
ON CONFLICT (key) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly_brl = EXCLUDED.price_monthly_brl,
  project_limit = EXCLUDED.project_limit,
  member_limit = EXCLUDED.member_limit,
  is_active = true;

INSERT INTO public.subscriptions (workspace_id, plan_id, status, seats, current_period_start)
SELECT
  w.id,
  p.id,
  'active'::public.subscription_status,
  5,
  CURRENT_DATE
FROM public.workspaces w
JOIN public.plans p ON p.key = 'starter'
LEFT JOIN public.subscriptions s ON s.workspace_id = w.id
WHERE s.id IS NULL;

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plans_admin_all" ON public.plans;
CREATE POLICY "plans_admin_all" ON public.plans
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "plans_authenticated_select" ON public.plans;
CREATE POLICY "plans_authenticated_select" ON public.plans FOR SELECT
  TO authenticated
  USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "subscriptions_admin_all" ON public.subscriptions;
CREATE POLICY "subscriptions_admin_all" ON public.subscriptions
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "subscriptions_workspace_select" ON public.subscriptions;
CREATE POLICY "subscriptions_workspace_select" ON public.subscriptions FOR SELECT
  USING (public.user_has_workspace_access(workspace_id));
