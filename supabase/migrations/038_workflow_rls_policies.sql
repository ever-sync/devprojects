-- Políticas RLS para Fase 2: Motor de Workflows e Automações

-- workflow_definitions
ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workflows in their workspace"
ON workflow_definitions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workflow_definitions.workspace_id
    AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Workspace members can create workflows"
ON workflow_definitions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workflow_definitions.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin', 'member')
  )
);

CREATE POLICY "Admins and owners can update workflows"
ON workflow_definitions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workflow_definitions.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Admins and owners can delete workflows"
ON workflow_definitions FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workflow_definitions.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin')
  )
);

-- workflow_executions
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view executions of workflows in their workspace"
ON workflow_executions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workflow_definitions wd
    JOIN workspace_members wm ON wm.workspace_id = wd.workspace_id
    WHERE wd.id = workflow_executions.workflow_id
    AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "System can create executions"
ON workflow_executions FOR INSERT
WITH CHECK (true);

-- workflow_step_executions
ALTER TABLE workflow_step_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view step executions of workflows in their workspace"
ON workflow_step_executions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workflow_executions we
    JOIN workflow_definitions wd ON wd.id = we.workflow_id
    JOIN workspace_members wm ON wm.workspace_id = wd.workspace_id
    WHERE we.id = workflow_step_executions.execution_id
    AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "System can create step executions"
ON workflow_step_executions FOR INSERT
WITH CHECK (true);

-- webhook_endpoints
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view webhooks in their workspace"
ON webhook_endpoints FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = webhook_endpoints.workspace_id
    AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Admins and owners can manage webhooks"
ON webhook_endpoints FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = webhook_endpoints.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Admins and owners can update webhooks"
ON webhook_endpoints FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = webhook_endpoints.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Admins and owners can delete webhooks"
ON webhook_endpoints FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = webhook_endpoints.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin')
  )
);

-- external_integrations
ALTER TABLE external_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view integrations in their workspace"
ON external_integrations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = external_integrations.workspace_id
    AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Admins and owners can manage integrations"
ON external_integrations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = external_integrations.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Admins and owners can update integrations"
ON external_integrations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = external_integrations.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Admins and owners can delete integrations"
ON external_integrations FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = external_integrations.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin')
  )
);

-- automation_templates
ALTER TABLE automation_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public templates are viewable by all"
ON automation_templates FOR SELECT
USING (is_public = true OR EXISTS (
  SELECT 1 FROM workspace_members wm
  WHERE wm.user_id = auth.uid()
));

CREATE POLICY "Only admins can create public templates"
ON automation_templates FOR INSERT
WITH CHECK (
  NOT is_public OR EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin')
  )
);
