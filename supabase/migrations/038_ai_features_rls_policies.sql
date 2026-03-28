-- Migration 038: RLS Policies for AI Features, Contracts & PDF
-- Políticas de segurança para as novas tabelas de IA e contratos

-- ============================================
-- CONTRACT TEMPLATES
-- ============================================

-- Enable RLS
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view templates from their workspace
CREATE POLICY "Users can view workspace contract templates"
  ON contract_templates
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Admins and owners can create templates
CREATE POLICY "Admins can create contract templates"
  ON contract_templates
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- Policy: Admins and owners can update templates
CREATE POLICY "Admins can update contract templates"
  ON contract_templates
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- Policy: Admins and owners can delete templates
CREATE POLICY "Admins can delete contract templates"
  ON contract_templates
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- ============================================
-- CONTRACTS
-- ============================================

-- Enable RLS
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view contracts from their workspace projects
CREATE POLICY "Users can view workspace contracts"
  ON contracts
  FOR SELECT
  USING (
    project_id IN (
      SELECT p.id 
      FROM projects p
      INNER JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

-- Policy: Admins and PMs can create contracts
CREATE POLICY "Admins can create contracts"
  ON contracts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM projects p
      INNER JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = project_id 
      AND wm.user_id = auth.uid() 
      AND wm.role IN ('owner', 'admin', 'manager')
    )
  );

-- Policy: Admins and PMs can update contracts
CREATE POLICY "Admins can update contracts"
  ON contracts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 
      FROM projects p
      INNER JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = project_id 
      AND wm.user_id = auth.uid() 
      AND wm.role IN ('owner', 'admin', 'manager')
    )
  );

-- Policy: Admins can delete contracts
CREATE POLICY "Admins can delete contracts"
  ON contracts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 
      FROM projects p
      INNER JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = project_id 
      AND wm.user_id = auth.uid() 
      AND wm.role IN ('owner', 'admin')
    )
  );

-- ============================================
-- CONTRACT SIGNATURES
-- ============================================

-- Enable RLS
ALTER TABLE contract_signatures ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view signatures from their workspace contracts
CREATE POLICY "Users can view contract signatures"
  ON contract_signatures
  FOR SELECT
  USING (
    contract_id IN (
      SELECT c.id 
      FROM contracts c
      INNER JOIN projects p ON c.project_id = p.id
      INNER JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

-- Policy: Authenticated users can create signatures (for signing flow)
CREATE POLICY "Authenticated users can create signatures"
  ON contract_signatures
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: Signers can update their own signatures
CREATE POLICY "Signers can update own signatures"
  ON contract_signatures
  FOR UPDATE
  USING (
    signer_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
    OR
    contract_id IN (
      SELECT c.id 
      FROM contracts c
      INNER JOIN projects p ON c.project_id = p.id
      INNER JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

-- ============================================
-- GENERATED DOCUMENTS
-- ============================================

-- Enable RLS
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view documents from their workspace projects
CREATE POLICY "Users can view workspace documents"
  ON generated_documents
  FOR SELECT
  USING (
    project_id IS NULL OR
    project_id IN (
      SELECT p.id 
      FROM projects p
      INNER JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

-- Policy: Team members can create documents
CREATE POLICY "Team members can create documents"
  ON generated_documents
  FOR INSERT
  WITH CHECK (
    project_id IS NULL OR
    EXISTS (
      SELECT 1 
      FROM projects p
      INNER JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = project_id 
      AND wm.user_id = auth.uid()
    )
  );

-- Policy: Admins can delete documents
CREATE POLICY "Admins can delete documents"
  ON generated_documents
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 
      FROM projects p
      INNER JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE (p.id = project_id OR project_id IS NULL)
      AND wm.user_id = auth.uid() 
      AND wm.role IN ('owner', 'admin')
    )
  );

-- ============================================
-- PROCESS ANALYSES
-- ============================================

-- Enable RLS
ALTER TABLE process_analyses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view analyses from their workspace projects
CREATE POLICY "Users can view process analyses"
  ON process_analyses
  FOR SELECT
  USING (
    project_id IN (
      SELECT p.id 
      FROM projects p
      INNER JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

-- Policy: Admins and PMs can create analyses
CREATE POLICY "Admins can create process analyses"
  ON process_analyses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM projects p
      INNER JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = project_id 
      AND wm.user_id = auth.uid() 
      AND wm.role IN ('owner', 'admin', 'manager')
    )
  );

-- Policy: Admins can delete analyses
CREATE POLICY "Admins can delete process analyses"
  ON process_analyses
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 
      FROM projects p
      INNER JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = project_id 
      AND wm.user_id = auth.uid() 
      AND wm.role IN ('owner', 'admin')
    )
  );

-- ============================================
-- AI GENERATED TASKS
-- ============================================

-- Enable RLS
ALTER TABLE ai_generated_tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view AI tasks from their workspace projects
CREATE POLICY "Users can view AI generated tasks"
  ON ai_generated_tasks
  FOR SELECT
  USING (
    project_id IN (
      SELECT p.id 
      FROM projects p
      INNER JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

-- Policy: Team members can create AI tasks
CREATE POLICY "Team members can create AI tasks"
  ON ai_generated_tasks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM projects p
      INNER JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = project_id 
      AND wm.user_id = auth.uid()
    )
  );

-- Policy: Users can update AI tasks they created
CREATE POLICY "Users can update own AI tasks"
  ON ai_generated_tasks
  FOR UPDATE
  USING (created_by = auth.uid());

-- Policy: Admins can delete AI tasks
CREATE POLICY "Admins can delete AI tasks"
  ON ai_generated_tasks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 
      FROM projects p
      INNER JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = project_id 
      AND wm.user_id = auth.uid() 
      AND wm.role IN ('owner', 'admin')
    )
  );

-- ============================================
-- GITHUB AI ANALYSES
-- ============================================

-- Enable RLS
ALTER TABLE github_ai_analyses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view GitHub analyses from their workspace projects
CREATE POLICY "Users can view GitHub AI analyses"
  ON github_ai_analyses
  FOR SELECT
  USING (
    project_id IN (
      SELECT p.id 
      FROM projects p
      INNER JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

-- Policy: Admins and PMs can create GitHub analyses
CREATE POLICY "Admins can create GitHub AI analyses"
  ON github_ai_analyses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM projects p
      INNER JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = project_id 
      AND wm.user_id = auth.uid() 
      AND wm.role IN ('owner', 'admin', 'manager')
    )
  );

-- Policy: Admins can delete GitHub analyses
CREATE POLICY "Admins can delete GitHub AI analyses"
  ON github_ai_analyses
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 
      FROM projects p
      INNER JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = project_id 
      AND wm.user_id = auth.uid() 
      AND wm.role IN ('owner', 'admin')
    )
  );

-- ============================================
-- WORKSPACE AI SETTINGS
-- ============================================

-- Enable RLS
ALTER TABLE workspace_ai_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Workspace members can view AI settings
CREATE POLICY "Members can view AI settings"
  ON workspace_ai_settings
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Only admins can create/update AI settings
CREATE POLICY "Admins can manage AI settings"
  ON workspace_ai_settings
  FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- ============================================
-- AI USAGE LOGS
-- ============================================

-- Enable RLS
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view usage logs from their workspace
CREATE POLICY "Admins can view AI usage logs"
  ON ai_usage_logs
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- Policy: System can insert usage logs (via service role or authenticated users)
CREATE POLICY "System can log AI usage"
  ON ai_usage_logs
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
