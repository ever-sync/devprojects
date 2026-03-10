-- ============================================================
-- 022_workspace_rls_transition.sql
-- Transicao progressiva da RLS de client_id para workspace_id
-- ============================================================

CREATE OR REPLACE FUNCTION public.user_has_client_access(target_client_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.clients c
    JOIN public.workspace_members wm ON wm.workspace_id = c.workspace_id
    WHERE c.id = target_client_id
      AND wm.user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.user_has_project_access(target_project_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE p.id = target_project_id
      AND wm.user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Base policies
DROP POLICY IF EXISTS "clients_client_select" ON public.clients;
CREATE POLICY "clients_client_select" ON public.clients FOR SELECT
  USING (public.user_has_workspace_access(workspace_id));

DROP POLICY IF EXISTS "projects_client_select" ON public.projects;
CREATE POLICY "projects_client_select" ON public.projects FOR SELECT
  USING (public.user_has_project_access(id));

DROP POLICY IF EXISTS "phases_client_select" ON public.project_phases;
CREATE POLICY "phases_client_select" ON public.project_phases FOR SELECT
  USING (public.user_has_project_access(project_id));

DROP POLICY IF EXISTS "tasks_client_select" ON public.tasks;
CREATE POLICY "tasks_client_select" ON public.tasks FOR SELECT
  USING (public.user_has_project_access(project_id));

DROP POLICY IF EXISTS "tasks_client_update" ON public.tasks;
CREATE POLICY "tasks_client_update" ON public.tasks FOR UPDATE
  USING (
    owner_type = 'client'
    AND public.user_has_project_access(project_id)
  )
  WITH CHECK (
    owner_type = 'client'
    AND public.user_has_project_access(project_id)
  );

DROP POLICY IF EXISTS "documents_client_select" ON public.documents;
CREATE POLICY "documents_client_select" ON public.documents FOR SELECT
  USING (public.user_has_client_access(client_id));

DROP POLICY IF EXISTS "comments_client_select" ON public.comments;
CREATE POLICY "comments_client_select" ON public.comments FOR SELECT
  USING (
    is_internal = false
    AND public.user_has_project_access(project_id)
  );

DROP POLICY IF EXISTS "Clients can view activities of their own projects" ON public.project_activities;
CREATE POLICY "Clients can view activities of their own projects" ON public.project_activities FOR SELECT
  USING (public.user_has_project_access(project_id));

DROP POLICY IF EXISTS "storage_client_select" ON storage.objects;
CREATE POLICY "storage_client_select" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'project-files'
    AND public.user_has_client_access(((storage.foldername(name))[1])::uuid)
  );

DO $$
BEGIN
  IF to_regclass('public.meetings') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "meetings_client_read" ON public.meetings';
    EXECUTE $policy$
      CREATE POLICY "meetings_client_read" ON public.meetings FOR SELECT
        TO authenticated
        USING (
          client_id IS NOT NULL
          AND public.user_has_client_access(client_id)
        )
    $policy$;
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.project_scope_versions') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "scope_versions_client_select" ON public.project_scope_versions';
    EXECUTE $policy$
      CREATE POLICY "scope_versions_client_select" ON public.project_scope_versions FOR SELECT
        USING (public.user_has_project_access(project_id))
    $policy$;
  END IF;

  IF to_regclass('public.change_requests') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "change_requests_client_select" ON public.change_requests';
    EXECUTE $policy$
      CREATE POLICY "change_requests_client_select" ON public.change_requests FOR SELECT
        USING (public.user_has_project_access(project_id))
    $policy$;
  END IF;

  IF to_regclass('public.change_request_items') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "change_request_items_admin_all" ON public.change_request_items';
    EXECUTE $policy$
      CREATE POLICY "change_request_items_admin_all" ON public.change_request_items
        USING (
          public.is_admin()
          OR change_request_id IN (
            SELECT cr.id
            FROM public.change_requests cr
            WHERE public.user_has_project_access(cr.project_id)
          )
        )
        WITH CHECK (public.is_admin())
    $policy$;
  END IF;

  IF to_regclass('public.approvals') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "approvals_client_select" ON public.approvals';
    EXECUTE $policy$
      CREATE POLICY "approvals_client_select" ON public.approvals FOR SELECT
        USING (public.user_has_project_access(project_id))
    $policy$;
  END IF;

  IF to_regclass('public.approval_items') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "approval_items_admin_all" ON public.approval_items';
    EXECUTE $policy$
      CREATE POLICY "approval_items_admin_all" ON public.approval_items
        USING (
          public.is_admin()
          OR approval_id IN (
            SELECT a.id
            FROM public.approvals a
            WHERE public.user_has_project_access(a.project_id)
          )
        )
        WITH CHECK (public.is_admin())
    $policy$;
  END IF;

  IF to_regclass('public.time_entries') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "time_entries_client_select" ON public.time_entries';
    EXECUTE $policy$
      CREATE POLICY "time_entries_client_select" ON public.time_entries FOR SELECT
        USING (public.user_has_project_access(project_id))
    $policy$;
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.task_dependencies') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "task_dependencies_client_select" ON public.task_dependencies';
    EXECUTE $policy$
      CREATE POLICY "task_dependencies_client_select" ON public.task_dependencies FOR SELECT
        USING (
          task_id IN (
            SELECT t.id
            FROM public.tasks t
            WHERE public.user_has_project_access(t.project_id)
          )
        )
    $policy$;
  END IF;

  IF to_regclass('public.project_risks') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "project_risks_client_select" ON public.project_risks';
    EXECUTE $policy$
      CREATE POLICY "project_risks_client_select" ON public.project_risks FOR SELECT
        USING (public.user_has_project_access(project_id))
    $policy$;
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.contracts') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "contracts_client_select" ON public.contracts';
    EXECUTE $policy$
      CREATE POLICY "contracts_client_select" ON public.contracts FOR SELECT
        USING (public.user_has_project_access(project_id))
    $policy$;
  END IF;

  IF to_regclass('public.billing_milestones') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "billing_milestones_client_select" ON public.billing_milestones';
    EXECUTE $policy$
      CREATE POLICY "billing_milestones_client_select" ON public.billing_milestones FOR SELECT
        USING (public.user_has_project_access(project_id))
    $policy$;
  END IF;

  IF to_regclass('public.invoices') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "invoices_client_select" ON public.invoices';
    EXECUTE $policy$
      CREATE POLICY "invoices_client_select" ON public.invoices FOR SELECT
        USING (public.user_has_project_access(project_id))
    $policy$;
  END IF;

  IF to_regclass('public.invoice_events') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "invoice_events_client_select" ON public.invoice_events';
    EXECUTE $policy$
      CREATE POLICY "invoice_events_client_select" ON public.invoice_events FOR SELECT
        USING (
          invoice_id IN (
            SELECT i.id
            FROM public.invoices i
            WHERE public.user_has_project_access(i.project_id)
          )
        )
    $policy$;
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.project_cost_snapshots') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "project_cost_snapshots_client_select" ON public.project_cost_snapshots';
    EXECUTE $policy$
      CREATE POLICY "project_cost_snapshots_client_select" ON public.project_cost_snapshots FOR SELECT
        USING (public.user_has_project_access(project_id))
    $policy$;
  END IF;

  IF to_regclass('public.project_metrics_snapshots') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "project_metrics_snapshots_client_select" ON public.project_metrics_snapshots';
    EXECUTE $policy$
      CREATE POLICY "project_metrics_snapshots_client_select" ON public.project_metrics_snapshots FOR SELECT
        USING (public.user_has_project_access(project_id))
    $policy$;
  END IF;

  IF to_regclass('public.delivery_forecasts') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "delivery_forecasts_client_select" ON public.delivery_forecasts';
    EXECUTE $policy$
      CREATE POLICY "delivery_forecasts_client_select" ON public.delivery_forecasts FOR SELECT
        USING (public.user_has_project_access(project_id))
    $policy$;
  END IF;
END;
$$;
