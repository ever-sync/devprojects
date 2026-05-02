-- Fase 1.3: Permissões granulares por função (job_role)
-- profiles.role continua como controle de acesso ao sistema ('admin' | 'client')
-- profiles.job_role define a função operacional do membro interno

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS job_role TEXT DEFAULT 'other'
  CHECK (job_role IN ('manager', 'developer', 'designer', 'finance', 'other'));

COMMENT ON COLUMN public.profiles.job_role IS 'Função operacional: manager, developer, designer, finance, other';

-- Admins existentes ficam como manager por padrão
UPDATE public.profiles SET job_role = 'manager' WHERE role = 'admin' AND job_role = 'other';

-- Extender workspace_members para suportar os novos roles granulares
ALTER TABLE public.workspace_members
  DROP CONSTRAINT IF EXISTS workspace_members_role_check;

ALTER TABLE public.workspace_members
  ADD CONSTRAINT workspace_members_role_check
  CHECK (role IN ('owner', 'admin', 'manager', 'developer', 'designer', 'finance', 'member'));

-- View de conveniência para o time interno com permissões resolvidas
CREATE OR REPLACE VIEW public.team_members_with_permissions AS
SELECT
  p.id,
  p.email,
  p.full_name,
  p.avatar_url,
  p.role            AS system_role,
  p.job_role,
  p.company,
  p.hour_cost,
  p.bill_rate,
  p.created_at,
  -- Permissões derivadas
  (p.role = 'admin') AS can_manage_users,
  (p.role = 'admin' OR p.job_role = 'manager') AS can_approve_proposals,
  (p.role = 'admin' OR p.job_role IN ('manager', 'finance')) AS can_view_financials,
  (p.role = 'admin' OR p.job_role IN ('manager', 'developer')) AS can_manage_projects,
  (p.role = 'admin' OR p.job_role = 'finance') AS can_manage_billing
FROM public.profiles p
WHERE p.role != 'client';

-- RLS: somente admins podem atualizar job_role
CREATE POLICY "profiles_admin_update_job_role" ON public.profiles
  FOR UPDATE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    OR id = auth.uid()
  )
  WITH CHECK (
    CASE
      WHEN id != auth.uid() THEN (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
      ELSE TRUE
    END
  );
