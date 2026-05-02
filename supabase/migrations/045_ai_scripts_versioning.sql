-- Módulo: Versionamento de Scripts/Prompts de IA de Atendimento

CREATE TYPE ai_script_status AS ENUM ('draft', 'staging', 'production', 'archived');

CREATE TABLE ai_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  channel TEXT NOT NULL DEFAULT 'whatsapp', -- whatsapp, telegram, web, voice, email
  content TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1,
  status ai_script_status NOT NULL DEFAULT 'draft',
  notes TEXT, -- changelog da versão
  parent_version_id UUID REFERENCES ai_scripts(id) ON DELETE SET NULL, -- versão anterior
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  promoted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  promoted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_ai_scripts_project ON ai_scripts(project_id);
CREATE INDEX idx_ai_scripts_workspace ON ai_scripts(workspace_id);
CREATE INDEX idx_ai_scripts_status ON ai_scripts(project_id, status);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_ai_scripts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_scripts_updated_at
  BEFORE UPDATE ON ai_scripts
  FOR EACH ROW EXECUTE FUNCTION update_ai_scripts_updated_at();

-- RLS
ALTER TABLE ai_scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view ai_scripts"
ON ai_scripts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = ai_scripts.workspace_id
    AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Workspace members can create ai_scripts"
ON ai_scripts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = ai_scripts.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin', 'member')
  )
);

CREATE POLICY "Workspace members can update ai_scripts"
ON ai_scripts FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = ai_scripts.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin', 'member')
  )
);

CREATE POLICY "Admins can delete ai_scripts"
ON ai_scripts FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = ai_scripts.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin')
  )
);

-- Tabela de relatórios de status para o cliente
CREATE TYPE report_status AS ENUM ('draft', 'sent');

CREATE TABLE client_status_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  content_markdown TEXT NOT NULL DEFAULT '',
  content_html TEXT,
  highlights TEXT[], -- pontos principais em bullet points
  blockers TEXT[], -- bloqueios do período
  next_steps TEXT[], -- próximos passos
  status report_status NOT NULL DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  sent_to TEXT[], -- emails para onde foi enviado
  generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_status_reports_project ON client_status_reports(project_id);
CREATE INDEX idx_client_status_reports_workspace ON client_status_reports(workspace_id);

CREATE OR REPLACE FUNCTION update_client_status_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER client_status_reports_updated_at
  BEFORE UPDATE ON client_status_reports
  FOR EACH ROW EXECUTE FUNCTION update_client_status_reports_updated_at();

ALTER TABLE client_status_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view reports"
ON client_status_reports FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = client_status_reports.workspace_id
    AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage reports"
ON client_status_reports FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = client_status_reports.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin', 'member')
  )
);

CREATE POLICY "Admins can update reports"
ON client_status_reports FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = client_status_reports.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin', 'member')
  )
);

CREATE POLICY "Admins can delete reports"
ON client_status_reports FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = client_status_reports.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin')
  )
);
