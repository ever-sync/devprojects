-- ============================================================
-- 019_security_hardening.sql
-- Hardening de RLS e protecao contra escalonamento de privilegio
-- ============================================================

-- Garantir que as policies publicas amplas continuem removidas.
DROP POLICY IF EXISTS "Public can view project by token" ON public.projects;
DROP POLICY IF EXISTS "Public can view project phases by token" ON public.project_phases;
DROP POLICY IF EXISTS "Public can view project tasks by token" ON public.tasks;
DROP POLICY IF EXISTS "Public can view project activities by token" ON public.project_activities;

-- Profiles: nao permitir insercao arbitraria nem elevacao de role pelo proprio usuario.
DROP POLICY IF EXISTS "profiles_insert_trigger" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_self_or_admin" ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NOT public.is_admin() THEN
    NEW.id = OLD.id;
    NEW.email = OLD.email;
    NEW.role = OLD.role;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS prevent_profile_privilege_escalation ON public.profiles;
CREATE TRIGGER prevent_profile_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- Approvals: cliente nao deve ter UPDATE generico em toda a linha.
DROP POLICY IF EXISTS "approvals_client_update" ON public.approvals;
