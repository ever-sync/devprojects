-- ============================================================
-- 009_lockdown_public_rls.sql
-- Remove overly-broad public RLS policies and rely on server-side token checks.
-- ============================================================

-- Projects
DROP POLICY IF EXISTS "Public can view project by token" ON public.projects;

-- Project phases
DROP POLICY IF EXISTS "Public can view project phases by token" ON public.project_phases;

-- Tasks
DROP POLICY IF EXISTS "Public can view project tasks by token" ON public.tasks;

-- Project activities
DROP POLICY IF EXISTS "Public can view project activities by token" ON public.project_activities;
