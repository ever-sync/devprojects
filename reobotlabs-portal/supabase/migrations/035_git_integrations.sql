-- Fase 1: Integração com Git e Gestão Técnica para Desenvolvedores
-- Migration: 035_git_integrations.sql

-- Tabela para armazenar integrações com repositórios Git
CREATE TABLE IF NOT EXISTS git_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('github', 'gitlab', 'bitbucket')),
  name TEXT NOT NULL,
  oauth_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  webhook_secret TEXT,
  webhook_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, provider)
);

-- Tabela para repositórios vinculados a projetos
CREATE TABLE IF NOT EXISTS project_repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES git_integrations(id) ON DELETE CASCADE,
  provider_repo_id TEXT NOT NULL, -- ID do repositório no provedor
  repo_name TEXT NOT NULL, -- ex: "owner/repo"
  repo_url TEXT NOT NULL,
  default_branch TEXT DEFAULT 'main',
  is_primary BOOLEAN DEFAULT true,
  auto_link_branches BOOLEAN DEFAULT true,
  auto_link_prs BOOLEAN DEFAULT true,
  auto_link_commits BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, provider_repo_id)
);

-- Tabela para branches vinculadas a tarefas
CREATE TABLE IF NOT EXISTS task_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  repository_id UUID NOT NULL REFERENCES project_repositories(id) ON DELETE CASCADE,
  branch_name TEXT NOT NULL,
  provider_branch_id TEXT, -- ID da branch no provedor (se disponível)
  pr_number INTEGER, -- Pull Request associado
  pr_url TEXT,
  pr_status TEXT CHECK (pr_status IN ('open', 'closed', 'merged', 'draft', null)),
  pr_title TEXT,
  commits_count INTEGER DEFAULT 0,
  last_commit_at TIMESTAMPTZ,
  last_commit_sha TEXT,
  is_merged BOOLEAN DEFAULT false,
  merged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para commits relacionados a tarefas/projetos
CREATE TABLE IF NOT EXISTS task_commits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  repository_id UUID NOT NULL REFERENCES project_repositories(id) ON DELETE CASCADE,
  commit_sha TEXT NOT NULL,
  commit_message TEXT NOT NULL,
  commit_url TEXT NOT NULL,
  author_name TEXT,
  author_email TEXT,
  author_avatar TEXT,
  committed_at TIMESTAMPTZ NOT NULL,
  files_changed INTEGER DEFAULT 0,
  additions INTEGER DEFAULT 0,
  deletions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para deployments/deploys
CREATE TABLE IF NOT EXISTS project_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  repository_id UUID REFERENCES project_repositories(id) ON DELETE SET NULL,
  environment TEXT NOT NULL CHECK (environment IN ('development', 'staging', 'production', 'preview')),
  deployment_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'building', 'success', 'failure', 'cancelled')),
  commit_sha TEXT,
  branch_name TEXT,
  deployed_by UUID REFERENCES auth.users(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  logs_url TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para atividades de Git (feed de atividade)
CREATE TABLE IF NOT EXISTS git_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES git_integrations(id) ON DELETE SET NULL,
  repository_id UUID REFERENCES project_repositories(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('push', 'pull_request', 'issue', 'comment', 'deployment', 'branch', 'merge')),
  actor_name TEXT,
  actor_avatar TEXT,
  action TEXT NOT NULL,
  description TEXT,
  payload JSONB DEFAULT '{}',
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_git_integrations_workspace ON git_integrations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_project_repositories_project ON project_repositories(project_id);
CREATE INDEX IF NOT EXISTS idx_task_branches_task ON task_branches(task_id);
CREATE INDEX IF NOT EXISTS idx_task_commits_task ON task_commits(task_id);
CREATE INDEX IF NOT EXISTS idx_task_commits_project ON task_commits(project_id);
CREATE INDEX IF NOT EXISTS idx_project_deployments_project ON project_deployments(project_id);
CREATE INDEX IF NOT EXISTS idx_git_activities_workspace ON git_activities(workspace_id);
CREATE INDEX IF NOT EXISTS idx_git_activities_project ON git_activities(project_id);
CREATE INDEX IF NOT EXISTS idx_git_activities_type ON git_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_task_commits_sha ON task_commits(commit_sha);
CREATE INDEX IF NOT EXISTS idx_task_branches_pr ON task_branches(pr_number);

-- Comentários nas tabelas
COMMENT ON TABLE git_integrations IS 'Integrações OAuth com provedores Git (GitHub, GitLab, Bitbucket)';
COMMENT ON TABLE project_repositories IS 'Repositórios Git vinculados a projetos';
COMMENT ON TABLE task_branches IS 'Branches vinculadas a tarefas com tracking de PRs';
COMMENT ON TABLE task_commits IS 'Commits relacionados a tarefas e projetos';
COMMENT ON TABLE project_deployments IS 'Histórico de deploys/environments';
COMMENT ON TABLE git_activities IS 'Feed de atividades de integrações Git';

-- Trigger para updated_at em git_integrations
CREATE OR REPLACE FUNCTION update_git_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_git_integrations_updated_at
  BEFORE UPDATE ON git_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_git_integrations_updated_at();

-- Trigger para updated_at em project_repositories
CREATE TRIGGER trg_project_repositories_updated_at
  BEFORE UPDATE ON project_repositories
  FOR EACH ROW
  EXECUTE FUNCTION update_git_integrations_updated_at();

-- Trigger para updated_at em task_branches
CREATE TRIGGER trg_task_branches_updated_at
  BEFORE UPDATE ON task_branches
  FOR EACH ROW
  EXECUTE FUNCTION update_git_integrations_updated_at();

-- Trigger para updated_at em project_deployments
CREATE TRIGGER trg_project_deployments_updated_at
  BEFORE UPDATE ON project_deployments
  FOR EACH ROW
  EXECUTE FUNCTION update_git_integrations_updated_at();
