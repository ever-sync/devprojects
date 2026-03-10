-- ============================================================
-- 025_client_users_legacy_sync.sql
-- Depreciacao controlada de client_users como espelho legado
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_users_user_client_unique
  ON public.client_users(user_id, client_id);

COMMENT ON TABLE public.client_users IS
  'Tabela legada. Mantida como espelho de compatibilidade a partir de workspace_members.';

CREATE OR REPLACE FUNCTION public.sync_client_users_from_workspace_members()
RETURNS TRIGGER AS $$
DECLARE
  target_workspace_id UUID;
  target_user_id UUID;
  legacy_client_id UUID;
  profile_role TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_workspace_id := OLD.workspace_id;
    target_user_id := OLD.user_id;
  ELSE
    target_workspace_id := NEW.workspace_id;
    target_user_id := NEW.user_id;
  END IF;

  SELECT role
  INTO profile_role
  FROM public.profiles
  WHERE id = target_user_id;

  IF profile_role IS DISTINCT FROM 'client' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  SELECT id
  INTO legacy_client_id
  FROM public.clients
  WHERE workspace_id = target_workspace_id
  LIMIT 1;

  IF legacy_client_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.client_users
    WHERE user_id = target_user_id
      AND client_id = legacy_client_id;

    RETURN OLD;
  END IF;

  INSERT INTO public.client_users (user_id, client_id)
  VALUES (target_user_id, legacy_client_id)
  ON CONFLICT (user_id, client_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sync_client_users_from_workspace_members_insert ON public.workspace_members;
CREATE TRIGGER sync_client_users_from_workspace_members_insert
AFTER INSERT ON public.workspace_members
FOR EACH ROW
EXECUTE FUNCTION public.sync_client_users_from_workspace_members();

DROP TRIGGER IF EXISTS sync_client_users_from_workspace_members_delete ON public.workspace_members;
CREATE TRIGGER sync_client_users_from_workspace_members_delete
AFTER DELETE ON public.workspace_members
FOR EACH ROW
EXECUTE FUNCTION public.sync_client_users_from_workspace_members();

INSERT INTO public.client_users (user_id, client_id)
SELECT wm.user_id, c.id
FROM public.workspace_members wm
JOIN public.clients c ON c.workspace_id = wm.workspace_id
JOIN public.profiles p ON p.id = wm.user_id
LEFT JOIN public.client_users cu ON cu.user_id = wm.user_id AND cu.client_id = c.id
WHERE p.role = 'client'
  AND cu.id IS NULL;
