-- Módulo: Versionamento de Workflows N8N

CREATE TYPE n8n_env AS ENUM ('development', 'staging', 'production');
CREATE TYPE n8n_snapshot_status AS ENUM ('draft', 'staging', 'production', 'archived');

CREATE TABLE n8n_workflow_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  n8n_workflow_id TEXT, -- ID do workflow no n8n (para sync via API)
  workflow_json JSONB NOT NULL DEFAULT '{}', -- snapshot completo do JSON do n8n
  version INTEGER NOT NULL DEFAULT 1,
  status n8n_snapshot_status NOT NULL DEFAULT 'draft',
  environment n8n_env NOT NULL DEFAULT 'development',
  notes TEXT, -- changelog da versão
  parent_version_id UUID REFERENCES n8n_workflow_snapshots(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  node_count INTEGER GENERATED ALWAYS AS (
    jsonb_array_length(COALESCE(workflow_json->'nodes', '[]'::jsonb))
  ) STORED,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  promoted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  promoted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de execuções/logs recebidos via webhook n8n
CREATE TABLE n8n_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID REFERENCES n8n_workflow_snapshots(id) ON DELETE SET NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  n8n_execution_id TEXT,
  n8n_workflow_id TEXT,
  status TEXT NOT NULL DEFAULT 'unknown', -- success, error, waiting
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  data JSONB DEFAULT '{}', -- payload completo do webhook
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_n8n_snapshots_project ON n8n_workflow_snapshots(project_id);
CREATE INDEX idx_n8n_snapshots_workspace ON n8n_workflow_snapshots(workspace_id);
CREATE INDEX idx_n8n_snapshots_status ON n8n_workflow_snapshots(project_id, status);
CREATE INDEX idx_n8n_logs_project ON n8n_execution_logs(project_id);
CREATE INDEX idx_n8n_logs_snapshot ON n8n_execution_logs(snapshot_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_n8n_snapshots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER n8n_snapshots_updated_at
  BEFORE UPDATE ON n8n_workflow_snapshots
  FOR EACH ROW EXECUTE FUNCTION update_n8n_snapshots_updated_at();

-- RLS n8n_workflow_snapshots
ALTER TABLE n8n_workflow_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view n8n_snapshots"
ON n8n_workflow_snapshots FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = n8n_workflow_snapshots.workspace_id
    AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Workspace members can create n8n_snapshots"
ON n8n_workflow_snapshots FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = n8n_workflow_snapshots.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin', 'member')
  )
);

CREATE POLICY "Workspace members can update n8n_snapshots"
ON n8n_workflow_snapshots FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = n8n_workflow_snapshots.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin', 'member')
  )
);

CREATE POLICY "Admins can delete n8n_snapshots"
ON n8n_workflow_snapshots FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = n8n_workflow_snapshots.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin')
  )
);

-- RLS n8n_execution_logs
ALTER TABLE n8n_execution_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view n8n logs"
ON n8n_execution_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = n8n_execution_logs.workspace_id
    AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "System can insert n8n logs"
ON n8n_execution_logs FOR INSERT
WITH CHECK (true);
