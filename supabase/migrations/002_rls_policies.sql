-- ============================================================
-- 002_rls_policies.sql
-- Row Level Security - Regra central:
-- Admins veem tudo; clientes veem apenas seu próprio client_id
-- ============================================================

-- Funções auxiliares
CREATE OR REPLACE FUNCTION public.get_user_client_id()
RETURNS UUID AS $$
  SELECT client_id FROM public.client_users WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- profiles
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_trigger" ON public.profiles FOR INSERT
  WITH CHECK (true); -- Apenas o trigger pode inserir (SECURITY DEFINER)

-- ============================================================
-- clients
-- ============================================================
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients_admin_all" ON public.clients
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "clients_client_select" ON public.clients FOR SELECT
  USING (id = public.get_user_client_id());

-- ============================================================
-- client_users
-- ============================================================
ALTER TABLE public.client_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_users_admin_all" ON public.client_users
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "client_users_select_own" ON public.client_users FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================
-- projects
-- ============================================================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_admin_all" ON public.projects
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "projects_client_select" ON public.projects FOR SELECT
  USING (client_id = public.get_user_client_id());

-- ============================================================
-- project_phases
-- ============================================================
ALTER TABLE public.project_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "phases_admin_all" ON public.project_phases
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "phases_client_select" ON public.project_phases FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE client_id = public.get_user_client_id()
    )
  );

-- ============================================================
-- tasks
-- ============================================================
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_admin_all" ON public.tasks
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Clientes podem ver todas as tasks dos seus projetos
CREATE POLICY "tasks_client_select" ON public.tasks FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE client_id = public.get_user_client_id()
    )
  );

-- Clientes só podem atualizar tasks onde owner_type = 'client'
CREATE POLICY "tasks_client_update" ON public.tasks FOR UPDATE
  USING (
    owner_type = 'client' AND
    project_id IN (
      SELECT id FROM public.projects WHERE client_id = public.get_user_client_id()
    )
  )
  WITH CHECK (
    owner_type = 'client' AND
    project_id IN (
      SELECT id FROM public.projects WHERE client_id = public.get_user_client_id()
    )
  );

-- ============================================================
-- documents
-- ============================================================
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_admin_all" ON public.documents
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "documents_client_select" ON public.documents FOR SELECT
  USING (client_id = public.get_user_client_id());

-- ============================================================
-- comments
-- ============================================================
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments_admin_all" ON public.comments
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Clientes só veem comentários não-internos dos seus projetos
CREATE POLICY "comments_client_select" ON public.comments FOR SELECT
  USING (
    is_internal = false AND
    project_id IN (
      SELECT id FROM public.projects WHERE client_id = public.get_user_client_id()
    )
  );

-- ============================================================
-- notifications
-- ============================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_own" ON public.notifications
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_admin_all" ON public.notifications
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
