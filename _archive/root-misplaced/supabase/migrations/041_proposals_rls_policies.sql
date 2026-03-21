-- Políticas RLS para módulo de propostas
ALTER TABLE project_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_versions ENABLE ROW LEVEL SECURITY;

-- Policies para project_proposals
CREATE POLICY "Users can view proposals in their workspace"
  ON project_proposals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = project_proposals.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create proposals in their workspace"
  ON project_proposals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = project_proposals.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY "Users can update proposals in their workspace"
  ON project_proposals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = project_proposals.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY "Users can delete proposals in their workspace"
  ON project_proposals FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = project_proposals.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin')
    )
  );

-- Policy para visualização pública via token
CREATE POLICY "Public access to proposals with valid token"
  ON project_proposals FOR SELECT
  USING (
    public_share_token IS NOT NULL
  );

-- Policies para proposal_phases
CREATE POLICY "Users can view proposal phases"
  ON proposal_phases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_proposals
      WHERE project_proposals.id = proposal_phases.proposal_id
      AND (
        EXISTS (
          SELECT 1 FROM workspace_members
          WHERE workspace_members.workspace_id = project_proposals.workspace_id
          AND workspace_members.user_id = auth.uid()
        )
        OR project_proposals.public_share_token IS NOT NULL
      )
    )
  );

CREATE POLICY "Users can manage proposal phases"
  ON proposal_phases FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM project_proposals
      JOIN workspace_members ON workspace_members.workspace_id = project_proposals.workspace_id
      WHERE project_proposals.id = proposal_phases.proposal_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin', 'manager')
    )
  );

-- Policies para proposal_items
CREATE POLICY "Users can view proposal items"
  ON proposal_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_proposals
      WHERE project_proposals.id = proposal_items.proposal_id
      AND (
        EXISTS (
          SELECT 1 FROM workspace_members
          WHERE workspace_members.workspace_id = project_proposals.workspace_id
          AND workspace_members.user_id = auth.uid()
        )
        OR project_proposals.public_share_token IS NOT NULL
      )
    )
  );

CREATE POLICY "Users can manage proposal items"
  ON proposal_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM project_proposals
      JOIN workspace_members ON workspace_members.workspace_id = project_proposals.workspace_id
      WHERE project_proposals.id = proposal_items.proposal_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin', 'manager')
    )
  );

-- Policies para proposal_terms
CREATE POLICY "Users can view proposal terms"
  ON proposal_terms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_proposals
      WHERE project_proposals.id = proposal_terms.proposal_id
      AND (
        EXISTS (
          SELECT 1 FROM workspace_members
          WHERE workspace_members.workspace_id = project_proposals.workspace_id
          AND workspace_members.user_id = auth.uid()
        )
        OR project_proposals.public_share_token IS NOT NULL
      )
    )
  );

CREATE POLICY "Users can manage proposal terms"
  ON proposal_terms FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM project_proposals
      JOIN workspace_members ON workspace_members.workspace_id = project_proposals.workspace_id
      WHERE project_proposals.id = proposal_terms.proposal_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin', 'manager')
    )
  );

-- Policies para proposal_versions
CREATE POLICY "Users can view proposal versions"
  ON proposal_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_proposals
      WHERE project_proposals.id = proposal_versions.proposal_id
      AND EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_members.workspace_id = project_proposals.workspace_id
        AND workspace_members.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create proposal versions"
  ON proposal_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_proposals
      JOIN workspace_members ON workspace_members.workspace_id = project_proposals.workspace_id
      WHERE project_proposals.id = proposal_versions.proposal_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.role IN ('owner', 'admin', 'manager')
    )
  );
