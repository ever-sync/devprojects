-- ============================================================
-- 021_workspace_foundation.sql
-- Fundacao de workspaces para evolucao multi-tenant
-- ============================================================

CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

CREATE INDEX idx_clients_workspace_id ON public.clients(workspace_id);
CREATE INDEX idx_projects_workspace_id ON public.projects(workspace_id);
CREATE INDEX idx_workspace_members_workspace_id ON public.workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user_id ON public.workspace_members(user_id);

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.workspace_slug_from_name(input_name TEXT)
RETURNS TEXT AS $$
  SELECT trim(BOTH '-' FROM regexp_replace(lower(coalesce(input_name, 'workspace')), '[^a-z0-9]+', '-', 'g'));
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.generate_workspace_slug(input_name TEXT, fallback_seed TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  candidate TEXT;
  suffix INTEGER := 1;
BEGIN
  base_slug := public.workspace_slug_from_name(input_name);

  IF base_slug IS NULL OR base_slug = '' THEN
    base_slug := 'workspace';
  END IF;

  IF fallback_seed IS NOT NULL AND fallback_seed <> '' THEN
    base_slug := left(base_slug || '-' || public.workspace_slug_from_name(fallback_seed), 50);
  END IF;

  candidate := base_slug;

  WHILE EXISTS (SELECT 1 FROM public.workspaces WHERE slug = candidate) LOOP
    suffix := suffix + 1;
    candidate := left(base_slug, 50) || '-' || suffix::text;
  END LOOP;

  RETURN candidate;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.user_has_workspace_access(target_workspace_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE workspace_id = target_workspace_id
      AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Criar um workspace inicial por cliente existente e vincular cliente/projetos.
DO $$
DECLARE
  client_record RECORD;
  workspace_slug TEXT;
  workspace_id_value UUID;
BEGIN
  FOR client_record IN
    SELECT id, name, created_by
    FROM public.clients
    WHERE workspace_id IS NULL
  LOOP
    workspace_slug := public.generate_workspace_slug(client_record.name, client_record.id::text);

    INSERT INTO public.workspaces (name, slug, owner_user_id)
    VALUES (client_record.name, workspace_slug, client_record.created_by)
    RETURNING id INTO workspace_id_value;

    UPDATE public.clients
    SET workspace_id = workspace_id_value
    WHERE id = client_record.id;

    UPDATE public.projects
    SET workspace_id = workspace_id_value
    WHERE client_id = client_record.id
      AND workspace_id IS NULL;

    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    SELECT workspace_id_value, cu.user_id, 'member'
    FROM public.client_users cu
    WHERE cu.client_id = client_record.id
    ON CONFLICT (workspace_id, user_id) DO NOTHING;

    IF client_record.created_by IS NOT NULL THEN
      INSERT INTO public.workspace_members (workspace_id, user_id, role)
      VALUES (workspace_id_value, client_record.created_by, 'owner')
      ON CONFLICT (workspace_id, user_id)
      DO UPDATE SET role = 'owner';
    END IF;
  END LOOP;
END;
$$;

ALTER TABLE public.clients
  ALTER COLUMN workspace_id SET NOT NULL;

ALTER TABLE public.projects
  ALTER COLUMN workspace_id SET NOT NULL;

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspaces_admin_all" ON public.workspaces
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "workspaces_member_select" ON public.workspaces FOR SELECT
  USING (public.user_has_workspace_access(id));

CREATE POLICY "workspace_members_admin_all" ON public.workspace_members
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "workspace_members_member_select" ON public.workspace_members FOR SELECT
  USING (
    public.user_has_workspace_access(workspace_id)
    OR user_id = auth.uid()
  );
