# Plano de Evolução - ReobotLabs Portal
## Transformação em Plataforma Profissional para Desenvolvedores, Automatizadores e Criadores

---

## 📋 Visão Geral

Este plano detalha a implementação de funcionalidades essenciais para transformar o ReobotLabs Portal em uma plataforma completa de gerenciamento de projetos para equipes técnicas.

**Objetivo:** Criar um hub centralizado que una gestão de projetos, desenvolvimento, automação e colaboração.

**Público-alvo:**
- Desenvolvedores (frontend, backend, full-stack)
- Automatizadores (Zapier, n8n, Make)
- Criadores de sites/agências
- Equipes de produto

---

## 🎯 FASE 1: Gestão Técnica para Desenvolvedores (Sprint 1-3)

### 1.1 Integração com Git (GitHub/GitLab/Bitbucket)

#### 1.1.1 Schema do Banco de Dados
```sql
-- Tabela: git_integrations
CREATE TABLE git_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  provider TEXT NOT NULL CHECK (provider IN ('github', 'gitlab', 'bitbucket')),
  installation_id TEXT NOT NULL,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: git_repositories
CREATE TABLE git_repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID REFERENCES git_integrations(id),
  provider_repo_id TEXT NOT NULL,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  owner TEXT NOT NULL,
  url TEXT NOT NULL,
  default_branch TEXT,
  is_private BOOLEAN,
  language TEXT,
  topics TEXT[],
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(integration_id, provider_repo_id)
);

-- Tabela: git_branches
CREATE TABLE git_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID REFERENCES git_repositories(id),
  name TEXT NOT NULL,
  commit_sha TEXT NOT NULL,
  protected BOOLEAN DEFAULT false,
  last_commit_date TIMESTAMPTZ,
  UNIQUE(repository_id, name)
);

-- Tabela: git_pull_requests
CREATE TABLE git_pull_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID REFERENCES git_repositories(id),
  pr_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  state TEXT NOT NULL CHECK (state IN ('open', 'closed', 'merged')),
  author_login TEXT,
  source_branch TEXT NOT NULL,
  target_branch TEXT NOT NULL,
  commit_count INTEGER,
  additions INTEGER,
  deletions INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  merged_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  url TEXT,
  UNIQUE(repository_id, pr_number)
);

-- Tabela: git_commits
CREATE TABLE git_commits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID REFERENCES git_repositories(id),
  sha TEXT NOT NULL,
  message TEXT NOT NULL,
  author_name TEXT,
  author_email TEXT,
  author_login TEXT,
  committed_at TIMESTAMPTZ,
  url TEXT,
  additions INTEGER,
  deletions INTEGER,
  UNIQUE(repository_id, sha)
);

-- Tabela: git_deployments
CREATE TABLE git_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  repository_id UUID REFERENCES git_repositories(id),
  environment TEXT NOT NULL CHECK (environment IN ('development', 'staging', 'production')),
  commit_sha TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'building', 'deploying', 'success', 'failed')),
  deployed_by UUID REFERENCES users(id),
  deployment_url TEXT,
  logs_url TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

-- Tabela: task_git_links (vincula tarefas a branches/PRs)
CREATE TABLE task_git_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES git_branches(id),
  pull_request_id UUID REFERENCES git_pull_requests(id),
  commit_id UUID REFERENCES git_commits(id),
  auto_linked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, branch_id, pull_request_id)
);

-- Índices
CREATE INDEX idx_git_repos_integration ON git_repositories(integration_id);
CREATE INDEX idx_git_prs_repository ON git_pull_requests(repository_id, state);
CREATE INDEX idx_git_commits_repo ON git_commits(repository_id, committed_at DESC);
CREATE INDEX idx_task_git_links_task ON task_git_links(task_id);
CREATE INDEX idx_deployments_project ON git_deployments(project_id, environment);
```

#### 1.1.2 Server Actions
- `connectGitProvider(provider, callbackUrl)` - OAuth flow
- `syncRepositories(integrationId)` - Importa repositórios
- `linkBranchToTask(taskId, branchName)` - Vincula branch à tarefa
- `linkPRToTask(taskId, prNumber)` - Vincula PR à tarefa
- `getPullRequestStatus(repoId, prNumber)` - Status do PR
- `triggerDeployment(projectId, environment, commitSha)` - Deploy manual
- `getDeploymentLogs(deploymentId)` - Logs de deploy
- `autoLinkCommitsToTasks(projectId)` - Link automático via mensagens de commit

#### 1.1.3 Componentes UI
- `GitIntegrationSettings` - Configurar integrações
- `RepositorySelector` - Selecionar repositório do projeto
- `BranchLinker` - Vincular branch à tarefa
- `PullRequestViewer` - Visualizar PRs vinculados
- `CommitHistory` - Histórico de commits da tarefa
- `DeploymentPanel` - Painel de deploys por ambiente
- `GitActivityFeed` - Feed de atividade Git no dashboard

#### 1.1.4 Features Chave
- ✅ **Auto-link**: Detecta "fix #123" ou "PROJ-123" em commits e vincula automaticamente
- ✅ **Status badges**: Mostra estado do PR (aberto, mergado, conflicts) na tarefa
- ✅ **Deploy previews**: Links diretos para preview deployments
- ✅ **Code review integration**: Notifica quando PR precisa de review
- ✅ **Branch protection**: Alertas se branch não segue convenções

---

### 1.2 Editor de Código Integrado

#### 1.2.1 Schema do Banco de Dados
```sql
-- Tabela: code_snippets
CREATE TABLE code_snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  task_id UUID REFERENCES tasks(id),
  title TEXT NOT NULL,
  description TEXT,
  language TEXT NOT NULL,
  content TEXT NOT NULL,
  file_path TEXT,
  version INTEGER DEFAULT 1,
  parent_snippet_id UUID REFERENCES code_snippets(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: snippet_comments
CREATE TABLE snippet_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snippet_id UUID REFERENCES code_snippets(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  line_number INTEGER,
  start_column INTEGER,
  end_column INTEGER,
  author_id UUID REFERENCES users(id),
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_snippets_project ON code_snippets(project_id);
CREATE INDEX idx_snippets_task ON code_snippets(task_id);
CREATE INDEX idx_snippet_comments_snippet ON snippet_comments(snippet_id, resolved);
```

#### 1.2.2 Server Actions
- `saveCodeSnippet(snippetData)` - Salva snippet
- `updateCodeSnippet(snippetId, content)` - Atualiza com versionamento
- `addSnippetComment(snippetId, commentData)` - Comentário inline
- `resolveSnippetComment(commentId)` - Resolve comentário
- `getSnippetHistory(snippetId)` - Histórico de versões
- `compareSnippetVersions(snippetId, version1, version2)` - Diff entre versões

#### 1.2.3 Componentes UI
- `CodeEditor` - Editor Monaco (VS Code engine) com syntax highlighting
- `SnippetViewer` - Visualizador de snippets com copy button
- `InlineComments` - Comentários contextuais por linha
- `VersionDiff` - Comparador visual de versões
- `LanguageSelector` - Seletor de linguagens (50+ suportadas)
- `CodePreview` - Preview renderizado para HTML/CSS/JS

#### 1.2.4 Features Chave
- ✅ **Syntax highlighting**: 50+ linguagens (JS, TS, Python, SQL, etc.)
- ✅ **Line numbers & folding**: Navegação facilitada
- ✅ **Auto-complete**: Sugestões básicas de código
- ✅ **Copy & export**: Exporta como gist ou arquivo
- ✅ **Embed em tarefas**: Snippets anexados diretamente às tasks
- ✅ **Shareable links**: Links públicos para snippets específicos

---

### 1.3 Rastreamento de Deploys e CI/CD

#### 1.3.1 Schema do Banco de Dados
```sql
-- Tabela: ci_cd_pipelines
CREATE TABLE ci_cd_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  repository_id UUID REFERENCES git_repositories(id),
  name TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('github_actions', 'gitlab_ci', 'jenkins', 'circleci')),
  workflow_id TEXT,
  status TEXT CHECK (status IN ('idle', 'running', 'success', 'failed', 'cancelled')),
  last_run_at TIMESTAMPTZ,
  last_run_status TEXT,
  last_run_duration_ms INTEGER,
  config_yaml TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: pipeline_runs
CREATE TABLE pipeline_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID REFERENCES ci_cd_pipelines(id),
  run_number INTEGER NOT NULL,
  trigger_type TEXT CHECK (trigger_type IN ('push', 'pull_request', 'manual', 'schedule', 'webhook')),
  commit_sha TEXT,
  branch_name TEXT,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'success', 'failed', 'cancelled')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  logs_url TEXT,
  triggered_by UUID REFERENCES users(id),
  UNIQUE(pipeline_id, run_number)
);

-- Tabela: pipeline_jobs
CREATE TABLE pipeline_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES pipeline_runs(id),
  job_name TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  logs TEXT,
  runner TEXT
);

-- Tabela: environments
CREATE TABLE environments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('development', 'staging', 'production', 'custom')),
  url TEXT,
  current_commit_sha TEXT,
  current_deployment_id UUID REFERENCES git_deployments(id),
  auto_deploy BOOLEAN DEFAULT false,
  protection_rules JSONB,
  variables JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_pipelines_project ON ci_cd_pipelines(project_id);
CREATE INDEX idx_pipeline_runs_pipeline ON pipeline_runs(pipeline_id, started_at DESC);
CREATE INDEX idx_environments_project ON environments(project_id, type);
```

#### 1.3.2 Server Actions
- `createPipeline(projectId, pipelineConfig)` - Cria pipeline
- `triggerPipeline(pipelineId, params)` - Dispara execução
- `cancelPipelineRun(runId)` - Cancela execução
- `getPipelineLogs(runId, jobId)` - Streaming de logs
- `configureEnvironment(envId, config)` - Configura ambiente
- `promoteDeployment(fromEnv, toEnv, deploymentId)` - Promove entre ambientes

#### 1.3.3 Componentes UI
- `PipelineDashboard` - Visão geral de todos os pipelines
- `PipelineRunner` - Trigger manual com parâmetros
- `BuildLogsViewer` - Logs em tempo real com highlight
- `EnvironmentManager` - Gerencia ambientes e variáveis
- `DeploymentTimeline` - Timeline de deploys por ambiente
- `CIStatusBadge` - Badge de status nos cards de tarefa

#### 1.3.4 Features Chave
- ✅ **Real-time logs**: Streaming de logs durante build
- ✅ **Retry failed jobs**: Re-executa jobs falhos com 1 clique
- ✅ **Environment variables**: Gestão segura de secrets
- ✅ **Deployment gates**: Aprovação manual para produção
- ✅ **Rollback rápido**: Volta para versão anterior
- ✅ **Notifications**: Alertas no Slack/Discord/Email

---

## 🤖 FASE 2: Automação Interna (Sprint 4-6)

### 2.1 Motor de Workflows Visuais

#### 2.1.1 Schema do Banco de Dados
```sql
-- Tabela: workflows
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  project_id UUID REFERENCES projects(id),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'scheduled', 'event', 'webhook')),
  trigger_config JSONB,
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: workflow_nodes
CREATE TABLE workflow_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  node_type TEXT NOT NULL, -- action, condition, delay, webhook, etc
  node_id TEXT NOT NULL, -- único no workflow
  position_x INTEGER,
  position_y INTEGER,
  config JSONB NOT NULL,
  label TEXT,
  icon TEXT
);

-- Tabela: workflow_edges
CREATE TABLE workflow_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  source_node_id TEXT NOT NULL,
  target_node_id TEXT NOT NULL,
  source_handle TEXT, -- para múltiplas saídas
  target_handle TEXT,
  label TEXT,
  condition JSONB -- para branches condicionais
);

-- Tabela: workflow_executions
CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id),
  trigger_type TEXT,
  trigger_data JSONB,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'paused')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  execution_log JSONB[]
);

-- Tabela: workflow_execution_steps
CREATE TABLE workflow_execution_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES workflow_executions(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  status TEXT NOT NULL,
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);

-- Índices
CREATE INDEX idx_workflows_project ON workflows(project_id, is_active);
CREATE INDEX idx_workflow_nodes_workflow ON workflow_nodes(workflow_id);
CREATE INDEX idx_workflow_executions_workflow ON workflow_executions(workflow_id, started_at DESC);
```

#### 2.1.2 Server Actions
- `createWorkflow(workflowData)` - Cria novo workflow
- `updateWorkflowCanvas(workflowId, nodes, edges)` - Atualiza canvas
- `executeWorkflow(workflowId, triggerData)` - Executa workflow
- `pauseWorkflowExecution(executionId)` - Pausa execução
- `resumeWorkflowExecution(executionId)` - Retoma execução
- `getWorkflowExecutionHistory(workflowId)` - Histórico de execuções
- `testWorkflowNode(workflowId, nodeId, testData)` - Testa nó isolado

#### 2.1.3 Componentes UI
- `WorkflowEditor` - Canvas drag-and-drop (React Flow)
- `NodePalette` - Palette de nós disponíveis
- `NodeConfigPanel` - Configuração de cada nó
- `WorkflowDebugger` - Debug step-by-step
- `ExecutionMonitor` - Monitora execuções em tempo real
- `WorkflowTemplates` - Templates pré-prontos

#### 2.1.4 Tipos de Nós Suportados
- **Triggers**: Webhook, Schedule, Event (task created, status changed), Manual
- **Actions**: Create task, Update task, Send email, Slack message, HTTP request, Run script
- **Logic**: Condition (if/else), Switch, Merge, Split
- **Delays**: Wait, Cron, Date-based
- **Integrations**: GitHub, GitLab, Slack, Discord, Email, Zapier webhook

#### 2.1.5 Features Chave
- ✅ **Visual builder**: Drag-and-drop intuitivo
- ✅ **Conditional branching**: If/else baseado em dados
- ✅ **Error handling**: Retry policies e fallback paths
- ✅ **Variables & expressions**: Template strings com dados dinâmicos
- ✅ **Sub-workflows**: Reutilização de workflows como nós
- ✅ **Execution history**: Log completo de cada execução

---

### 2.2 Integração com Webhooks e APIs Externas

#### 2.2.1 Schema do Banco de Dados
```sql
-- Tabela: webhooks
CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  project_id UUID REFERENCES projects(id),
  name TEXT NOT NULL,
  url TEXT NOT NULL, -- URL pública gerada
  secret TEXT NOT NULL, -- para assinatura HMAC
  events TEXT[] NOT NULL, -- eventos que dispara
  is_active BOOLEAN DEFAULT true,
  headers JSONB,
  payload_template JSONB,
  retry_policy JSONB DEFAULT '{"maxRetries": 3, "backoff": "exponential"}',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_triggered_at TIMESTAMPTZ
);

-- Tabela: webhook_deliveries
CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'retrying')),
  http_status INTEGER,
  response_body TEXT,
  attempt_count INTEGER DEFAULT 1,
  next_retry_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: incoming_webhooks
CREATE TABLE incoming_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  project_id UUID REFERENCES projects(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE, -- parte da URL pública
  mapping_config JSONB NOT NULL, -- mapeia payload para ações
  is_active BOOLEAN DEFAULT true,
  auth_type TEXT CHECK (auth_type IN ('none', 'api_key', 'jwt', 'basic')),
  auth_config JSONB,
  rate_limit INTEGER DEFAULT 100, -- requests por hora
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: incoming_webhook_logs
CREATE TABLE incoming_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID REFERENCES incoming_webhooks(id),
  raw_payload JSONB,
  processed_data JSONB,
  actions_triggered TEXT[],
  status TEXT CHECK (status IN ('success', 'partial', 'failed')),
  error_message TEXT,
  ip_address INET,
  user_agent TEXT,
  received_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: api_integrations
CREATE TABLE api_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  name TEXT NOT NULL,
  provider TEXT NOT NULL, -- zapier, n8n, make, custom
  base_url TEXT,
  auth_type TEXT NOT NULL,
  auth_config JSONB,
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_webhooks_project ON webhooks(project_id, is_active);
CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id, created_at DESC);
CREATE INDEX idx_incoming_webhooks_slug ON incoming_webhooks(slug);
```

#### 2.2.2 Server Actions
- `createOutgoingWebhook(webhookConfig)` - Cria webhook de saída
- `testWebhook(webhookId)` - Testa disparo
- `rotateWebhookSecret(webhookId)` - Rotaciona secret
- `replayWebhookDelivery(deliveryId)` - Reenvia delivery falho
- `createIncomingWebhook(webhookConfig)` - Cria webhook de entrada
- `mapIncomingPayload(webhookId, payload)` - Processa payload recebido
- `connectApiIntegration(provider, credentials)` - Conecta API externa

#### 2.2.3 Componentes UI
- `WebhookManager` - Gerencia webhooks de saída
- `WebhookTester` - Testa e debuga webhooks
- `DeliveryLogViewer` - Logs de deliveries com retry
- `IncomingWebhookBuilder` - Configura webhooks de entrada
- `PayloadMapper` - Mapeia campos de payload para ações
- `IntegrationHub` - Catálogo de integrações prontas

#### 2.2.4 Features Chave
- ✅ **HMAC signatures**: Segurança para webhooks
- ✅ **Automatic retries**: Retry exponencial para falhas
- ✅ **Payload transformation**: Transforma dados antes de enviar
- ✅ **Event filtering**: Filtra eventos por condições
- ✅ **Rate limiting**: Protege contra abuso
- ✅ **Public URLs**: Gera URLs públicas para incoming webhooks
- ✅ **Zapier/n8n ready**: Templates prontos para automações externas

---

### 2.3 Templates Inteligentes de Projetos

#### 2.3.1 Schema do Banco de Dados
```sql
-- Tabela: project_templates
CREATE TABLE project_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- web_dev, mobile_app, automation, marketing, etc
  thumbnail_url TEXT,
  is_public BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: template_phases
CREATE TABLE template_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES project_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  color TEXT,
  estimated_days INTEGER
);

-- Tabela: template_tasks
CREATE TABLE template_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID REFERENCES template_phases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT,
  priority TEXT DEFAULT 'medium',
  estimated_hours DECIMAL(5,2),
  assignee_role TEXT, -- role necessário, não usuário específico
  dependencies INTEGER[], -- índices de tasks dependentes
  checklist_items JSONB,
  custom_fields JSONB,
  tags TEXT[],
  attachments_template JSONB
);

-- Tabela: template_automations
CREATE TABLE template_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES project_templates(id) ON DELETE CASCADE,
  trigger_event TEXT NOT NULL,
  action_type TEXT NOT NULL,
  config JSONB NOT NULL
);

-- Tabela: template_integrations
CREATE TABLE template_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES project_templates(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL, -- git, slack, github, etc
  config_schema JSONB,
  required BOOLEAN DEFAULT false
);

-- Índices
CREATE INDEX idx_templates_category ON project_templates(category, is_public);
CREATE INDEX idx_template_tasks_phase ON template_tasks(phase_id, order_index);
```

#### 2.3.2 Server Actions
- `createProjectFromTemplate(templateId, projectConfig)` - Instancia projeto
- `saveAsTemplate(projectId, templateConfig)` - Salva projeto como template
- `getTemplatePreview(templateId)` - Preview do template
- `customizeTemplate(templateId, customizations)` - Customiza antes de criar
- `importTemplate(templateJson)` - Importa template JSON
- `exportTemplate(templateId)` - Exporta template JSON
- `rateTemplate(templateId, rating)` - Avalia template público

#### 2.3.3 Componentes UI
- `TemplateGallery` - Galeria de templates com filtros
- `TemplatePreview` - Preview detalhado do template
- `TemplateCustomizer` - Customiza antes de criar projeto
- `TemplateBuilder` - Editor visual de templates
- `TemplateImporter` - Importa/exporta templates
- `SmartSuggestions` - Sugere templates baseado no contexto

#### 2.3.4 Templates Pré-construídos
1. **Website Development**
   - Discovery → Design → Development → QA → Launch
   - Tasks: Briefing, Wireframes, Mockups, Frontend, Backend, Testing, Deploy
   - Automations: Deploy on merge, Notify client on milestones

2. **Mobile App Development**
   - Planning → UI/UX → Dev → Testing → Store Submission
   - Tasks: User stories, Prototypes, iOS/Android dev, TestFlight, Store assets

3. **Automation Project**
   - Analysis → Design → Build → Test → Deploy → Monitor
   - Tasks: Process mapping, Workflow design, Zapier/n8n build, Testing, Monitoring

4. **SaaS Feature Development**
   - Ideation → Spec → Dev → Review → Release
   - Tasks: PRD, Technical spec, Implementation, Code review, Documentation

5. **Client Onboarding**
   - Welcome → Setup → Training → Kickoff → First Delivery
   - Tasks: Contract, Access setup, Intro call, Goal setting

#### 2.3.5 Features Chave
- ✅ **One-click creation**: Cria projeto completo em segundos
- ✅ **Role-based assignment**: Atribui por roles, não usuários
- ✅ **Custom fields**: Campos customizados por template
- ✅ **Built-in automations**: Automações já configuradas
- ✅ **Integration presets**: Integrações pré-configuradas
- ✅ **Community templates**: Compartilha templates publicamente
- ✅ **AI suggestions**: Sugere templates baseado em descrição

---

## 💬 FASE 3: Colaboração Avançada (Sprint 7-9)

### 3.1 Comentários Contextuais em Threads

#### 3.1.1 Melhorias no Schema Existente
```sql
-- Adicionar ao schema existente de comments
ALTER TABLE comments ADD COLUMN parent_comment_id UUID REFERENCES comments(id);
ALTER TABLE comments ADD COLUMN in_reply_to UUID REFERENCES comments(id);
ALTER TABLE comments ADD COLUMN thread_id UUID;
ALTER TABLE comments ADD COLUMN edited_at TIMESTAMPTZ;
ALTER TABLE comments ADD COLUMN reactions JSONB DEFAULT '{}';
ALTER TABLE comments ADD COLUMN attachments JSONB DEFAULT '[]';
ALTER TABLE comments ADD COLUMN mentioned_users UUID[];

-- Tabela: comment_mentions
CREATE TABLE comment_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID REFERENCES users(id),
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: comment_edits
CREATE TABLE comment_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  previous_content TEXT NOT NULL,
  edited_by UUID REFERENCES users(id),
  edited_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_comments_thread ON comments(thread_id, created_at);
CREATE INDEX idx_comment_mentions_user ON comment_mentions(mentioned_user_id, is_read);
```

#### 3.1.2 Server Actions
- `createCommentThread(taskId, content)` - Cria nova thread
- `replyToComment(commentId, content)` - Responde em thread
- `editComment(commentId, newContent)` - Edita comentário
- `deleteComment(commentId)` - Deleta (soft delete)
- `addCommentReaction(commentId, emoji)` - Adiciona reação
- `mentionUsers(commentId, userIds)` - Menciona usuários
- `resolveCommentThread(threadId)` - Marca thread como resolvida
- `getCommentThread(threadId)` - Busca thread completa

#### 3.1.3 Componentes UI
- `CommentThread` - Thread com replies aninhados
- `CommentEditor` - Editor rich text com menções
- `MentionPicker` - Picker de usuários com @
- `ReactionPicker` - Picker de emojis
- `ThreadResolver` - Marca thread como resolvida
- `CommentSearch` - Busca em comentários
- `UnreadIndicator` - Indicador de comentários não lidos

#### 3.1.4 Features Chave
- ✅ **Nested replies**: Respostas infinitamente aninhadas
- ✅ **@mentions**: Notifica usuários mencionados
- ✅ **Emoji reactions**: Reage com emojis
- ✅ **Edit history**: Histórico de edições
- ✅ **Rich text**: Formatação, código, listas
- ✅ **File attachments**: Anexa arquivos aos comentários
- ✅ **Resolve threads**: Marca discussões como resolvidas
- ✅ **Unread tracking**: Rastreia comentários não lidos

---

### 3.2 Modo Offline com Sincronização Otimista

#### 3.2.1 Arquitetura
```typescript
// Estrutura de sincronização
interface OfflineStore {
  pendingMutations: PendingMutation[];
  localCache: Map<string, any>;
  lastSyncedAt: Date;
}

interface PendingMutation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: string;
  data: any;
  timestamp: number;
  retryCount: number;
}
```

#### 3.2.2 Schema do Banco de Dados
```sql
-- Tabela: sync_metadata
CREATE TABLE sync_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  device_id TEXT NOT NULL,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  sync_version INTEGER DEFAULT 1,
  conflict_resolution_strategy TEXT DEFAULT 'last_write_wins'
);

-- Tabela: offline_queue (opcional, para persistência server-side)
CREATE TABLE offline_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  mutation_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);
```

#### 3.2.3 Hooks & Utilities
- `useOfflineAwareQuery(queryFn)` - Query que funciona offline
- `useOptimisticMutation(mutationFn)` - Mutation otimista
- `syncPendingMutations()` - Sincroniza quando online
- `detectConflicts(local, remote)` - Detecta conflitos
- `resolveConflict(strategy, local, remote)` - Resolve conflitos

#### 3.2.4 Componentes UI
- `OfflineIndicator` - Mostra status de conexão
- `SyncStatus` - Status da sincronização
- `ConflictResolver` - UI para resolver conflitos manualmente
- `OfflineQueueViewer` - Visualiza fila de operações pendentes

#### 3.2.5 Features Chave
- ✅ **Optimistic updates**: UI atualiza instantaneamente
- ✅ **Background sync**: Sincroniza em segundo plano
- ✅ **Conflict detection**: Detecta edições conflitantes
- ✅ **Multiple strategies**: Last-write-wins, manual merge, etc
- ✅ **Queue management**: Gerencia fila de operações
- ✅ **Progressive enhancement**: Funciona parcial sem conexão
- ✅ **Cache persistence**: IndexedDB para cache persistente

---

### 3.3 Atalhos de Teclado

#### 3.3.1 Sistema de Atalhos
```typescript
// Definição de atalhos
const keyboardShortcuts = {
  // Globais
  'mod+k': { action: 'openCommandPalette', description: 'Buscar comandos' },
  'mod+/': { action: 'toggleShortcutHelp', description: 'Ajuda de atalhos' },
  'g then d': { action: 'goToDashboard', description: 'Ir para Dashboard' },
  'g then p': { action: 'goToProjects', description: 'Ir para Projetos' },
  'g then t': { action: 'goToTasks', description: 'Ir para Tarefas' },
  
  // Tarefas
  'c': { action: 'createTask', description: 'Criar tarefa', context: 'tasks' },
  'enter': { action: 'openTask', description: 'Abrir tarefa', context: 'taskList' },
  'e': { action: 'editTask', description: 'Editar tarefa', context: 'taskDetail' },
  'd': { action: 'deleteTask', description: 'Deletar tarefa', context: 'taskDetail' },
  'm': { action: 'assignToMe', description: 'Atribuir a mim', context: 'taskDetail' },
  
  // Kanban
  'arrowleft': { action: 'moveCardLeft', description: 'Mover coluna esquerda', context: 'kanban' },
  'arrowright': { action: 'moveCardRight', description: 'Mover coluna direita', context: 'kanban' },
  'arrowup': { action: 'moveCardUp', description: 'Mover card cima', context: 'kanban' },
  'arrowdown': { action: 'moveCardDown', description: 'Mover card baixo', context: 'kanban' },
  
  // Editor
  'mod+s': { action: 'saveContent', description: 'Salvar', context: 'editor' },
  'mod+z': { action: 'undo', description: 'Desfazer', context: 'editor' },
  'mod+shift+z': { action: 'redo', description: 'Refazer', context: 'editor' },
  'mod+b': { action: 'toggleBold', description: 'Negrito', context: 'editor' },
  'mod+i': { action: 'toggleItalic', description: 'Itálico', context: 'editor' },
};
```

#### 3.3.2 Componentes UI
- `KeyboardShortcutProvider` - Provider global de atalhos
- `ShortcutListener` - Hook para registrar atalhos contextuais
- `CommandPalette` - Palette de comandos (Cmd+K)
- `ShortcutHelpModal` - Modal com todos os atalhos
- `ShortcutHint` - Hints visuais de atalhos em botões

#### 3.3.3 Features Chave
- ✅ **Context-aware**: Atalhos mudam conforme contexto
- ✅ **Customizable**: Usuário pode customizar atalhos
- ✅ **Discoverable**: Cmd+K mostra todos os comandos
- ✅ **Conflict prevention**: Previne conflitos com browser
- ✅ **Accessibility**: Navegação completa por teclado
- ✅ **Mac/Windows**: Suporta ambos (mod = Ctrl/Cmd)

---

## 👥 FASE 4: Gestão de Equipe (Sprint 10-12)

### 4.1 Controle de Carga de Trabalho

#### 4.1.1 Schema do Banco de Dados
```sql
-- Tabela: team_capacity
CREATE TABLE team_capacity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  week_start DATE NOT NULL,
  total_hours DECIMAL(4,2) NOT NULL DEFAULT 40,
  available_hours DECIMAL(4,2),
  time_off_hours DECIMAL(4,2) DEFAULT 0,
  meeting_hours DECIMAL(4,2) DEFAULT 0,
  buffer_percentage DECIMAL(5,2) DEFAULT 20,
  notes TEXT,
  UNIQUE(user_id, week_start)
);

-- Tabela: time_off_requests
CREATE TABLE time_off_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('vacation', 'sick', 'personal', 'holiday', 'other')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: workload_snapshots
CREATE TABLE workload_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  snapshot_date DATE NOT NULL,
  assigned_hours DECIMAL(5,2),
  logged_hours DECIMAL(5,2),
  overallocated_hours DECIMAL(5,2),
  utilization_percentage DECIMAL(5,2),
  task_count INTEGER,
  project_count INTEGER
);

-- Índices
CREATE INDEX idx_team_capacity_user ON team_capacity(user_id, week_start);
CREATE INDEX idx_time_off_user ON time_off_requests(user_id, start_date);
CREATE INDEX idx_workload_snapshots_user ON workload_snapshots(user_id, snapshot_date);
```

#### 4.1.2 Server Actions
- `setUserCapacity(userId, weekStart, capacity)` - Define capacidade
- `requestTimeOff(requestData)` - Solicita tempo livre
- `approveTimeOff(requestId)` - Aprova solicitação
- `calculateWorkload(userId, dateRange)` - Calcula carga atual
- `getTeamWorkloadOverview(teamId, dateRange)` - Visão do time
- `detectOverallocation(projectId)` - Detecta sobrecarga
- `rebalanceWorkload(projectId)` - Sugere rebalanceamento

#### 4.1.3 Componentes UI
- `CapacityPlanner` - Planeja capacidade semanal
- `WorkloadChart` - Gráfico de carga por usuário
- `TeamHeatmap` - Heatmap de sobrecarga do time
- `TimeOffCalendar` - Calendário de férias/ausências
- `OverallocationAlert` - Alertas de sobrecarga
- `UtilizationReport` - Relatório de utilização

#### 4.1.4 Features Chave
- ✅ **Capacity planning**: Define horas disponíveis por semana
- ✅ **Time off tracking**: Rastreia férias e ausências
- ✅ **Utilization metrics**: % de utilização por membro
- ✅ **Overallocation alerts**: Alerta quando sobrecarregado
- ✅ **Forecasting**: Previsão de carga futura
- ✅ **Rebalancing suggestions**: Sugere redistribuição

---

### 4.2 Sprints com Gráficos de Burndown

#### 4.2.1 Schema do Banco de Dados
```sql
-- Tabela: sprints
CREATE TABLE sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  name TEXT NOT NULL,
  goal TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'cancelled')),
  story_points_total DECIMAL(5,2),
  story_points_completed DECIMAL(5,2),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: sprint_tasks
CREATE TABLE sprint_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id UUID REFERENCES sprints(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id),
  story_points DECIMAL(3,1),
  original_estimate DECIMAL(5,2),
  remaining_estimate DECIMAL(5,2),
  added_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(sprint_id, task_id)
);

-- Tabela: burndown_snapshots
CREATE TABLE burndown_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id UUID REFERENCES sprints(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  ideal_remaining DECIMAL(5,2) NOT NULL,
  actual_remaining DECIMAL(5,2) NOT NULL,
  story_points_completed DECIMAL(5,2),
  tasks_completed INTEGER,
  tasks_total INTEGER,
  UNIQUE(sprint_id, snapshot_date)
);

-- Índices
CREATE INDEX idx_sprints_project ON sprints(project_id, status);
CREATE INDEX idx_burndown_snapshots_sprint ON burndown_snapshots(sprint_id, snapshot_date);
```

#### 4.2.2 Server Actions
- `createSprint(sprintData)` - Cria sprint
- `startSprint(sprintId)` - Inicia sprint
- `completeSprint(sprintId)` - Completa sprint
- `addTaskToSprint(sprintId, taskId, storyPoints)` - Adiciona task
- `removeTaskFromSprint(sprintId, taskId)` - Remove task
- `captureBurndownSnapshot(sprintId)` - Captura snapshot diário
- `getBurndownData(sprintId)` - Dados para gráfico
- `calculateVelocity(projectId)` - Calcula velocidade do time

#### 4.2.3 Componentes UI
- `SprintBoard` - Board dedicado para sprint
- `BurndownChart` - Gráfico de burndown ideal vs real
- `SprintPlanning` - Planejamento de sprint com drag-and-drop
- `VelocityChart` - Gráfico de velocidade por sprint
- `SprintReport` - Relatório pós-sprint
- `DailyStandup` - Ferramenta de daily standup

#### 4.2.4 Features Chave
- ✅ **Story points**: Estimativa por pontos
- ✅ **Burndown tracking**: Gráfico diário automático
- ✅ **Velocity tracking**: Média de pontos por sprint
- ✅ **Scope change tracking**: Rastreia mudanças de escopo
- ✅ **Sprint reports**: Relatório automático de retrospectiva
- ✅ **Capacity-based planning**: Planeja baseado na capacidade

---

### 4.3 Estimativas de Tempo

#### 4.3.1 Schema do Banco de Dados
```sql
-- Adicionar colunas à tabela tasks existente
ALTER TABLE tasks ADD COLUMN original_estimate DECIMAL(5,2); -- horas
ALTER TABLE tasks ADD COLUMN remaining_estimate DECIMAL(5,2);
ALTER TABLE tasks ADD COLUMN time_logged DECIMAL(5,2) DEFAULT 0;
ALTER TABLE tasks ADD COLUMN estimation_method TEXT DEFAULT 'hours'; -- hours, story_points, tshirt

-- Tabela: time_estimates_history
CREATE TABLE time_estimates_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  estimate_type TEXT NOT NULL CHECK (estimate_type IN ('original', 'remaining', 'logged')),
  old_value DECIMAL(5,2),
  new_value DECIMAL(5,2),
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT
);

-- Tabela: estimation_metrics
CREATE TABLE estimation_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  user_id UUID REFERENCES users(id),
  task_type TEXT,
  avg_original_estimate DECIMAL(5,2),
  avg_actual_time DECIMAL(5,2),
  accuracy_percentage DECIMAL(5,2),
  sample_size INTEGER,
  last_calculated_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX idx_estimates_history_task ON time_estimates_history(task_id, changed_at);
CREATE INDEX idx_estimation_metrics_project ON estimation_metrics(project_id, task_type);
```

#### 4.3.2 Server Actions
- `estimateTask(taskId, hours, method)` - Estima tarefa
- `updateRemainingEstimate(taskId, hours)` - Atualiza restante
- `logTime(taskId, hours, description)` - Registra tempo
- `getEstimationAccuracy(userId, projectId)` - Precisão das estimativas
- `suggestEstimate(taskId, similarTasks)` - Sugere baseado em histórico
- `calculateVariance(taskId)` - Calcula variação estimado vs real

#### 4.3.3 Componentes UI
- `EstimateInput` - Input de estimativa com métodos múltiplos
- `TimeTrackingWidget` - Widget de time tracking
- `EstimationAccuracyChart` - Gráfico de precisão
- `VarianceReport` - Relatório de variações
- `SimilarTasksSuggester` - Sugere baseado em tasks similares
- `BurnupChart` - Gráfico de burnup (escopo + tempo)

#### 4.3.4 Features Chave
- ✅ **Multiple methods**: Horas, story points, T-shirt sizes
- ✅ **Time tracking**: Timer integrado para log de tempo
- ✅ **Accuracy tracking**: Mede precisão das estimativas
- ✅ **AI suggestions**: Sugere baseado em histórico
- ✅ **Variance analysis**: Analisa desvios
- ✅ **Rollover estimates**: Restante carrega para próximo dia

---

## 🏢 FASE 5: Infraestrutura Empresarial (Sprint 13-15)

### 5.1 Single Sign-On (SSO)

#### 5.1.1 Schema do Banco de Dados
```sql
-- Tabela: sso_providers
CREATE TABLE sso_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  provider_type TEXT NOT NULL CHECK (provider_type IN ('saml', 'oidc', 'oauth')),
  provider_name TEXT NOT NULL, -- Okta, Azure AD, Google, etc
  entity_id TEXT,
  acs_url TEXT,
  certificate_public TEXT,
  certificate_private_encrypted TEXT,
  client_id TEXT,
  client_secret_encrypted TEXT,
  issuer_url TEXT,
  authorization_endpoint TEXT,
  token_endpoint TEXT,
  userinfo_endpoint TEXT,
  scopes TEXT[],
  attribute_mapping JSONB, -- mapeia atributos SSO para campos do sistema
  is_active BOOLEAN DEFAULT true,
  enforced BOOLEAN DEFAULT false, -- força SSO para todo workspace
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: sso_sessions
CREATE TABLE sso_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  provider_id UUID REFERENCES sso_providers(id),
  session_id TEXT NOT NULL,
  assertion_id TEXT, -- SAML AssertionID
  id_token TEXT, -- OIDC ID Token
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT
);

-- Tabela: sso_audit_logs
CREATE TABLE sso_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  event_type TEXT NOT NULL, -- login_success, login_failed, logout, provision, deprovision
  user_email TEXT,
  user_id UUID,
  provider_id UUID,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_sso_providers_workspace ON sso_providers(workspace_id, is_active);
CREATE INDEX idx_sso_sessions_user ON sso_sessions(user_id, expires_at);
CREATE INDEX idx_sso_audit_logs_workspace ON sso_audit_logs(workspace_id, created_at);
```

#### 5.1.2 Server Actions
- `configureSSOProvider(workspaceId, providerConfig)` - Configura SSO
- `testSSOConnection(providerId)` - Testa conexão
- `initiateSSOLogin(providerId, relayState)` - Inicia fluxo SSO
- `handleSSOCallback(providerId, samlResponse/idToken)` - Processa callback
- `enforceSSO(workspaceId, enabled)` - Ativa/desativa enforce
- `provisionUserFromSSO(providerId, attributes)` - Provisiona usuário
- `deprovisionUser(userId)` - Deprovisiona usuário
- `getSSOAuditLogs(workspaceId, dateRange)` - Logs de auditoria

#### 5.1.3 Componentes UI
- `SSOConfigurationWizard` - Wizard de configuração
- `SSODashboard` - Dashboard de provedores ativos
- `AttributeMapper` - Mapeia atributos SSO
- `SSOEnforcementToggle` - Toggle de enforce
- `SSOAuditLogViewer` - Visualizador de logs
- `LoginSSOButton` - Botão de login SSO customizável

#### 5.1.4 Features Chave
- ✅ **SAML 2.0**: Suporte completo SAML
- ✅ **OIDC/OAuth2**: OpenID Connect e OAuth
- ✅ **Auto-provisioning**: Cria usuários automaticamente
- ✅ **Just-in-time provisioning**: Cria no primeiro login
- ✅ **Enforcement**: Força SSO para todo workspace
- ✅ **Certificate rotation**: Rotação automática de certificados
- ✅ **Audit logging**: Logs completos de auditoria

---

### 5.2 Permissões Granulares (RBAC + ABAC)

#### 5.2.1 Schema do Banco de Dados
```sql
-- Tabela: roles
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  name TEXT NOT NULL,
  description TEXT,
  is_system_role BOOLEAN DEFAULT false, -- roles do sistema não podem ser deletadas
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: permissions
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  resource TEXT NOT NULL, -- project, task, document, etc
  action TEXT NOT NULL, -- create, read, update, delete, share
  description TEXT
);

-- Tabela: role_permissions
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE(role_id, permission_id)
);

-- Tabela: user_roles
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  role_id UUID REFERENCES roles(id),
  scope_type TEXT CHECK (scope_type IN ('workspace', 'project', 'custom')),
  scope_id UUID, -- project_id se scope_type = project
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE(user_id, role_id, scope_type, scope_id)
);

-- Tabela: abac_policies
CREATE TABLE abac_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  name TEXT NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL,
  policy_expression JSONB NOT NULL, -- expressão lógica ABAC
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: access_grants
CREATE TABLE access_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_type TEXT CHECK (grant_type IN ('user', 'role', 'team', 'public')),
  grantee_id UUID, -- user_id, role_id, or team_id
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  permissions TEXT[] NOT NULL,
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  conditions JSONB -- condições adicionais
);

-- Roles do sistema pré-definidas
INSERT INTO roles (workspace_id, name, description, is_system_role) VALUES
(NULL, 'workspace_owner', 'Proprietário do workspace - acesso total', true),
(NULL, 'workspace_admin', 'Administrador do workspace', true),
(NULL, 'project_manager', 'Gerente de projeto', true),
(NULL, 'team_member', 'Membro da equipe', true),
(NULL, 'viewer', 'Visualizador - apenas leitura', true),
(NULL, 'client', 'Cliente - acesso limitado ao portal', true);

-- Índices
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_scope ON user_roles(scope_type, scope_id);
CREATE INDEX idx_access_grants_resource ON access_grants(resource_type, resource_id);
CREATE INDEX idx_abac_policies_workspace ON abac_policies(workspace_id, resource_type);
```

#### 5.2.2 Server Actions
- `createRole(workspaceId, roleData)` - Cria role customizada
- `assignRole(userId, roleId, scope)` - Atribui role com escopo
- `revokeRole(userRoleId)` - Revoga role
- `checkPermission(userId, resource, action)` - Check de permissão
- `createABACPolicy(workspaceId, policyData)` - Cria política ABAC
- `evaluateABACPolicy(policyId, context)` - Avalia política
- `getResourcePermissions(userId, resourceType, resourceId)` - Permissões do recurso
- `auditAccessCheck(userId, resource, action, result)` - Auditoria de acesso

#### 5.2.3 Componentes UI
- `RoleManager` - Gerenciador de roles
- `PermissionMatrix` - Matriz visual de permissões
- `AccessControlEditor` - Editor de ACL por recurso
- `ABACPolicyBuilder` - Builder visual de políticas ABAC
- `PermissionChecker` - Ferramenta de debug de permissões
- `AccessAuditLog` - Logs de acesso

#### 5.2.4 Features Chave
- ✅ **RBAC**: Role-Based Access Control
- ✅ **ABAC**: Attribute-Based Access Control
- ✅ **Scoped roles**: Roles com escopo (workspace, project, custom)
- ✅ **Inheritance**: Herança de permissões
- ✅ **Temporary access**: Acesso com expiração
- ✅ **Public sharing**: Compartilhamento público controlado
- ✅ **Audit trail**: Auditoria completa de acessos

---

### 5.3 Auditoria de Alterações

#### 5.3.1 Schema do Banco de Dados
```sql
-- Tabela: audit_logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  actor_id UUID REFERENCES users(id),
  actor_email TEXT, -- caso usuário seja deletado
  action_type TEXT NOT NULL, -- create, update, delete, login, logout, permission_change, etc
  resource_type TEXT NOT NULL,
  resource_id UUID,
  resource_name TEXT,
  changes JSONB, -- { field: { old, new } }
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: audit_log_archives
CREATE TABLE audit_log_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  archive_period_start DATE NOT NULL,
  archive_period_end DATE NOT NULL,
  record_count INTEGER NOT NULL,
  storage_path TEXT NOT NULL, -- S3 path ou similar
  checksum TEXT NOT NULL,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  retention_until DATE NOT NULL,
  UNIQUE(workspace_id, archive_period_start, archive_period_end)
);

-- Índices compostos para queries eficientes
CREATE INDEX idx_audit_logs_workspace_actor ON audit_logs(workspace_id, actor_id, created_at DESC);
CREATE INDEX idx_audit_logs_workspace_resource ON audit_logs(workspace_id, resource_type, resource_id, created_at DESC);
CREATE INDEX idx_audit_logs_workspace_action ON audit_logs(workspace_id, action_type, created_at DESC);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Partitioning por mês para performance (opcional, para grandes volumes)
-- CREATE TABLE audit_logs_2025_01 PARTITION OF audit_logs FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

#### 5.3.2 Server Actions
- `logAuditEvent(auditData)` - Registra evento de auditoria
- `getAuditLogs(workspaceId, filters)` - Busca logs com filtros
- `exportAuditLogs(workspaceId, dateRange, format)` - Exporta logs
- `archiveAuditLogs(workspaceId, dateRange)` - Arquiva logs antigos
- `restoreAuditLogs(archiveId)` - Restaura logs arquivados
- `getEntityHistory(resourceType, resourceId)` - Histórico de entidade
- `compareEntityVersions(resourceType, resourceId, timestamp1, timestamp2)` - Compara versões

#### 5.3.3 Componentes UI
- `AuditLogViewer` - Visualizador de logs com filtros avançados
- `EntityTimeline` - Timeline de alterações de entidade
- `ChangeDiffViewer` - Visualizador de diff de alterações
- `AuditExportTool` - Ferramenta de exportação
- `ComplianceReport` - Relatório de compliance
- `SuspiciousActivityAlert` - Alertas de atividade suspeita

#### 5.3.4 Features Chave
- ✅ **Complete trail**: Rastreia todas as alterações
- ✅ **Field-level diffs**: Mostra mudanças por campo
- ✅ **Advanced filtering**: Filtra por usuário, ação, recurso, data
- ✅ **Export capabilities**: Exporta em CSV, JSON, PDF
- ✅ **Long-term archiving**: Arquivamento automático
- ✅ **Tamper-proof**: Logs imutáveis com checksum
- ✅ **Compliance ready**: SOC2, GDPR, LGPD compliant

---

### 5.4 API Pública

#### 5.4.1 Schema do Banco de Dados
```sql
-- Tabela: api_clients
CREATE TABLE api_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  name TEXT NOT NULL,
  description TEXT,
  client_id TEXT NOT NULL UNIQUE,
  client_secret_encrypted TEXT NOT NULL,
  redirect_uris TEXT[],
  allowed_origins TEXT[],
  rate_limit_per_minute INTEGER DEFAULT 100,
  rate_limit_per_day INTEGER DEFAULT 10000,
  is_active BOOLEAN DEFAULT true,
  scopes TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

-- Tabela: api_tokens
CREATE TABLE api_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES api_clients(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  refresh_token_hash TEXT UNIQUE,
  scopes TEXT[] NOT NULL,
  expires_at TIMESTAMPTZ,
  revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

-- Tabela: api_request_logs
CREATE TABLE api_request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES api_clients(id),
  token_id UUID REFERENCES api_tokens(id),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  request_headers JSONB,
  request_body JSONB,
  response_size INTEGER,
  duration_ms INTEGER,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: api_webhooks_subscriptions
CREATE TABLE api_webhooks_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES api_clients(id) ON DELETE CASCADE,
  events TEXT[] NOT NULL,
  endpoint_url TEXT NOT NULL,
  secret TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_api_clients_workspace ON api_clients(workspace_id, is_active);
CREATE INDEX idx_api_tokens_client ON api_tokens(client_id, expires_at);
CREATE INDEX idx_api_request_logs_client ON api_request_logs(client_id, created_at DESC);
CREATE INDEX idx_api_request_logs_endpoint ON api_request_logs(endpoint, created_at DESC);
```

#### 5.4.2 Endpoints da API
```yaml
# Autenticação
POST /oauth/token                    # OAuth2 token endpoint
POST /oauth/revoke                   # Revogar token
GET  /oauth/me                       # Info do token atual

# Workspaces
GET    /api/v1/workspaces            # Listar workspaces
GET    /api/v1/workspaces/:id        # Detalhes do workspace
PATCH  /api/v1/workspaces/:id        # Atualizar workspace

# Projects
GET    /api/v1/projects              # Listar projetos
POST   /api/v1/projects              # Criar projeto
GET    /api/v1/projects/:id          # Detalhes do projeto
PATCH  /api/v1/projects/:id          # Atualizar projeto
DELETE /api/v1/projects/:id          # Deletar projeto

# Tasks
GET    /api/v1/tasks                 # Listar tarefas (com filtros)
POST   /api/v1/tasks                 # Criar tarefa
GET    /api/v1/tasks/:id             # Detalhes da tarefa
PATCH  /api/v1/tasks/:id             # Atualizar tarefa
DELETE /api/v1/tasks/:id             # Deletar tarefa
POST   /api/v1/tasks/:id/comments    # Adicionar comentário
GET    /api/v1/tasks/:id/attachments # Listar anexos

# Users
GET    /api/v1/users                 # Listar usuários
GET    /api/v1/users/:id             # Detalhes do usuário
PATCH  /api/v1/users/:id             # Atualizar usuário

# Teams
GET    /api/v1/teams                 # Listar times
POST   /api/v1/teams                 # Criar time
GET    /api/v1/teams/:id             # Detalhes do time
PATCH  /api/v1/teams/:id             # Atualizar time

# Time Tracking
GET    /api/v1/time-entries          # Listar time entries
POST   /api/v1/time-entries          # Criar time entry
PATCH  /api/v1/time-entries/:id      # Atualizar time entry
DELETE /api/v1/time-entries/:id      # Deletar time entry

# Reports
GET    /api/v1/reports/burndown      # Relatório burndown
GET    /api/v1/reports/velocity      # Relatório velocity
GET    /api/v1/reports/utilization   # Relatório utilization
POST   /api/v1/reports/custom        # Relatório customizado

# Webhooks (API)
GET    /api/v1/webhooks              # Listar webhooks
POST   /api/v1/webhooks              # Criar webhook
PATCH  /api/v1/webhooks/:id          # Atualizar webhook
DELETE /api/v1/webhooks/:id          # Deletar webhook
```

#### 5.4.3 Server Actions & Middleware
- `authenticateAPIToken(token)` - Autentica token
- `authorizeAPIScope(token, scope)` - Verifica escopo
- `rateLimitMiddleware(clientId)` - Aplica rate limiting
- `logAPIRequest(requestData)` - Loga requisição
- `generateAPIDocs()` - Gera documentação OpenAPI
- `validateAPIRequest(schema, data)` - Valida payload

#### 5.4.4 Componentes UI
- `APIDashboard` - Dashboard de clientes API
- `APIClientManager` - Gerencia clientes API
- `TokenGenerator` - Gera tokens de acesso
- `APIUsageAnalytics` - Analytics de uso da API
- `APIDocumentation` - Docs interativos (Swagger/OpenAPI)
- `WebhookManager` - Gerencia webhooks da API
- `APIKeyRotator` - Rotação de chaves

#### 5.4.5 Features Chave
- ✅ **OAuth2**: Fluxo completo OAuth2
- ✅ **API Keys**: Chaves simples para integrações
- ✅ **Rate limiting**: Limites configuráveis
- ✅ **Scoped tokens**: Tokens com escopos específicos
- ✅ **Webhooks**: Webhooks para eventos da API
- ✅ **Interactive docs**: Documentação Swagger/OpenAPI
- ✅ **SDK generation**: Gera SDKs automáticos (JS, Python, etc)
- ✅ **Versioning**: Versionamento de API (v1, v2, etc)

---

## 📅 Roadmap de Implementação

### Sprint 1-3: Gestão Técnica para Desenvolvedores
- [ ] Semana 1: Schema Git + Server Actions básicos
- [ ] Semana 2: OAuth GitHub/GitLab + Componentes UI
- [ ] Semana 3: Editor de código + CI/CD tracking

### Sprint 4-6: Automação Interna
- [ ] Semana 4: Schema workflows + React Flow editor
- [ ] Semana 5: Webhooks outgoing/incoming
- [ ] Semana 6: Templates inteligentes

### Sprint 7-9: Colaboração Avançada
- [ ] Semana 7: Threads de comentários
- [ ] Semana 8: Modo offline + sync otimista
- [ ] Semana 9: Atalhos de teclado + Command palette

### Sprint 10-12: Gestão de Equipe
- [ ] Semana 10: Capacidade + workload
- [ ] Semana 11: Sprints + burndown
- [ ] Semana 12: Estimativas + time tracking

### Sprint 13-15: Infraestrutura Empresarial
- [ ] Semana 13: SSO (SAML/OIDC)
- [ ] Semana 14: RBAC + ABAC
- [ ] Semana 15: Audit logs + API pública

---

## 🎯 Métricas de Sucesso

### Adoção
- 80% dos devs usando integração Git em 30 dias
- 50% de projetos criados a partir de templates em 60 dias
- 70% de redução em reuniões de status com dashboards

### Performance
- < 100ms para operações críticas
- 99.9% uptime para API pública
- Sync offline em < 5s após reconexão

### Satisfação
- NPS > 50 após lançamento de cada fase
- < 5% churn rate mensal
- 4.5+ estrelas em reviews

---

## 🔧 Tecnologias Recomendadas

### Frontend
- **React Flow**: Editor de workflows visuais
- **Monaco Editor**: Editor de código (VS Code engine)
- **TanStack Query**: Cache + sync offline
- **Zustand**: Estado global leve
- **Hotkeys.js**: Gerenciamento de atalhos

### Backend
- **Supabase Functions**: Edge functions para webhooks
- **pg_cron**: Jobs agendados no banco
- **Redis**: Cache + filas de background jobs
- **Temporal.io**: Orquestração de workflows complexos

### Infraestrutura
- **Vercel**: Deploy frontend + edge functions
- **Supabase**: Database + Auth + Realtime
- **Cloudflare**: CDN + DDoS protection
- **Sentry**: Error tracking
- **PostHog**: Product analytics

---

## 📝 Próximos Passos Imediatos

1. **Priorizar Fase 1**: Começar com integração Git (maior impacto para devs)
2. **Criar RFCs**: Documentar especificações técnicas de cada feature
3. **Setup de ambiente**: Configurar repositórios de teste GitHub/GitLab
4. **Design system**: Criar componentes base no Figma
5. **Beta testers**: Recrutar 10-20 equipes para feedback antecipado

---

**Versão do Plano:** 1.0  
**Última Atualização:** Janeiro 2025  
**Status:** Pronto para implementação
