-- Fase 2: Motor de Workflows e Automações
-- Tabela: workflow_definitions
CREATE TABLE IF NOT EXISTS workflow_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'webhook', 'scheduled', 'event')),
  trigger_config JSONB DEFAULT '{}',
  steps JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_run_at TIMESTAMPTZ,
  execution_count INTEGER DEFAULT 0
);

-- Tabela: workflow_executions
CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  triggered_by UUID REFERENCES auth.users(id),
  trigger_payload JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  logs JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: workflow_step_executions
CREATE TABLE IF NOT EXISTS workflow_step_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  step_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: webhook_endpoints
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES workflow_definitions(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  endpoint_url TEXT NOT NULL,
  secret_token TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  is_active BOOLEAN DEFAULT true,
  headers JSONB DEFAULT '{}',
  last_triggered_at TIMESTAMPTZ,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: external_integrations
CREATE TABLE IF NOT EXISTS external_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL CHECK (service_type IN ('zapier', 'n8n', 'make', 'slack', 'discord', 'email', 'custom')),
  name TEXT NOT NULL,
  credentials JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: automation_templates
CREATE TABLE IF NOT EXISTS automation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  steps JSONB NOT NULL,
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_workspace ON workflow_definitions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_active ON workflow_definitions(is_active);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_step_executions_execution ON workflow_step_executions(execution_id);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_workspace ON webhook_endpoints(workspace_id);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_workflow ON webhook_endpoints(workflow_id);
CREATE INDEX IF NOT EXISTS idx_external_integrations_workspace ON external_integrations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_automation_templates_category ON automation_templates(category);

-- Comentários
COMMENT ON TABLE workflow_definitions IS 'Definições de workflows de automação';
COMMENT ON TABLE workflow_executions IS 'Histórico de execuções de workflows';
COMMENT ON TABLE workflow_step_executions IS 'Execução individual de cada step do workflow';
COMMENT ON TABLE webhook_endpoints IS 'Endpoints webhook para triggers externos';
COMMENT ON TABLE external_integrations IS 'Integrações com serviços externos (Zapier, n8n, etc)';
COMMENT ON TABLE automation_templates IS 'Templates pré-definidos de automações';

-- Função para incrementar contador de execuções
CREATE OR REPLACE FUNCTION increment_workflow_execution_count(p_workflow_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE workflow_definitions
  SET 
    execution_count = execution_count + 1,
    last_run_at = NOW(),
    updated_at = NOW()
  WHERE id = p_workflow_id;
END;
$$ LANGUAGE plpgsql;

-- Insert de templates padrão de automações
INSERT INTO automation_templates (name, description, category, trigger_type, steps, tags, is_public) VALUES
(
  'Criar Tarefa ao Receber Issue do GitHub',
  'Automaticamente cria uma tarefa quando uma nova issue é criada no GitHub',
  'github',
  'webhook',
  '[
    {
      "name": "Parse GitHub Payload",
      "type": "parser",
      "config": {
        "source": "github",
        "event": "issues.opened"
      }
    },
    {
      "name": "Create Task",
      "type": "task_create",
      "config": {
        "title": "{{payload.issue.title}}",
        "description": "{{payload.issue.body}}",
        "priority": "medium",
        "labels": ["github", "issue"]
      }
    }
  ]',
  ARRAY['github', 'issues', 'automation'],
  true
),
(
  'Notificar Slack ao Completar Tarefa',
  'Envia notificação para canal do Slack quando uma tarefa é concluída',
  'slack',
  'event',
  '[
    {
      "name": "Check Task Status",
      "type": "condition",
      "config": {
        "field": "status",
        "operator": "equals",
        "value": "completed"
      }
    },
    {
      "name": "Send Slack Message",
      "type": "slack_message",
      "config": {
        "channel": "#projetos",
        "message": "✅ Tarefa *{{task.title}}* foi concluída por {{user.name}}"
      }
    }
  ]',
  ARRAY['slack', 'notificacao', 'tarefa'],
  true
),
(
  'Criar Projeto a partir de Template',
  'Automatiza criação de projetos com tarefas pré-definidas',
  'projeto',
  'manual',
  '[
    {
      "name": "Create Project",
      "type": "project_create",
      "config": {
        "name": "{{input.project_name}}",
        "client_id": "{{input.client_id}}"
      }
    },
    {
      "name": "Create Phases",
      "type": "loop",
      "config": {
        "items": "{{template.phases}}",
        "action": "phase_create"
      }
    },
    {
      "name": "Create Tasks",
      "type": "loop",
      "config": {
        "items": "{{template.tasks}}",
        "action": "task_create"
      }
    }
  ]',
  ARRAY['projeto', 'template', 'automacao'],
  true
),
(
  'Sincronizar com Google Calendar',
  'Cria eventos no Google Calendar para reuniões agendadas',
  'calendar',
  'event',
  '[
    {
      "name": "Check Meeting Type",
      "type": "condition",
      "config": {
        "field": "meeting_type",
        "operator": "equals",
        "value": "scheduled"
      }
    },
    {
      "name": "Create Calendar Event",
      "type": "google_calendar_create",
      "config": {
        "summary": "{{meeting.title}}",
        "description": "{{meeting.description}}",
        "start": "{{meeting.start_time}}",
        "end": "{{meeting.end_time}}",
        "attendees": "{{meeting.participants}}"
      }
    }
  ]',
  ARRAY['google', 'calendar', 'reunioes'],
  true
),
(
  'Backup Automático de Dados',
  'Realiza backup periódico dos dados do projeto',
  'backup',
  'scheduled',
  '[
    {
      "name": "Export Projects",
      "type": "data_export",
      "config": {
        "tables": ["projects", "tasks", "clients"],
        "format": "json"
      }
    },
    {
      "name": "Upload to Storage",
      "type": "storage_upload",
      "config": {
        "bucket": "backups",
        "path": "daily/{{date}}.json"
      }
    },
    {
      "name": "Notify Completion",
      "type": "email_send",
      "config": {
        "to": "{{admin_email}}",
        "subject": "Backup Completo",
        "body": "Backup realizado com sucesso em {{date}}"
      }
    }
  ]',
  ARRAY['backup', 'dados', 'agendado'],
  true
);

