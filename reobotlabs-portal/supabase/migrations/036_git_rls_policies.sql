-- Políticas RLS para integrações Git
-- Migration: 036_git_rls_policies.sql

-- Habilitar RLS em todas as tabelas
ALTER TABLE git_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_commits ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE git_activities ENABLE ROW LEVEL SECURITY;

-- ============================================
-- git_integrations policies
-- ============================================

-- Policy: Usuários autenticados podem ver integrações do seu workspace
CREATE POLICY "Users can view integrations in their workspace"
  ON git_integrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspaces w
      WHERE w.id = git_integrations.workspace_id
      AND w.id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    )
  );

-- Policy: Apenas admins podem criar/editar/excluir integrações
CREATE POLICY "Admins can manage integrations"
  ON git_integrations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = git_integrations.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

-- ============================================
-- project_repositories policies
-- ============================================

-- Policy: Membros do workspace podem ver repositórios dos projetos que têm acesso
CREATE POLICY "Members can view project repositories"
  ON project_repositories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      INNER JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = project_repositories.project_id
      AND wm.user_id = auth.uid()
    )
  );

-- Policy: Membros do workspace podem adicionar repositórios a projetos
CREATE POLICY "Members can add repositories to projects"
  ON project_repositories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      INNER JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = project_repositories.project_id
      AND wm.user_id = auth.uid()
    )
  );

-- Policy: Apenas admins podem editar/excluir repositórios
CREATE POLICY "Admins can manage repositories"
  ON project_repositories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      INNER JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = project_repositories.project_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

-- ============================================
-- task_branches policies
-- ============================================

-- Policy: Membros do workspace podem ver branches de tarefas
CREATE POLICY "Members can view task branches"
  ON task_branches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      INNER JOIN projects p ON t.project_id = p.id
      INNER JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE t.id = task_branches.task_id
      AND wm.user_id = auth.uid()
    )
  );

-- Policy: Membros do workspace podem criar branches
CREATE POLICY "Members can create task branches"
  ON task_branches FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks t
      INNER JOIN projects p ON t.project_id = p.id
      INNER JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE t.id = task_branches.task_id
      AND wm.user_id = auth.uid()
    )
  );

-- Policy: Membros do workspace podem atualizar branches
CREATE POLICY "Members can update task branches"
  ON task_branches FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      INNER JOIN projects p ON t.project_id = p.id
      INNER JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE t.id = task_branches.task_id
      AND wm.user_id = auth.uid()
    )
  );

-- ============================================
-- task_commits policies
-- ============================================

-- Policy: Membros do workspace podem ver commits
CREATE POLICY "Members can view task commits"
  ON task_commits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      INNER JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = task_commits.project_id
      AND wm.user_id = auth.uid()
    )
  );

-- Policy: Sistema pode inserir commits (via webhooks/actions)
CREATE POLICY "System can insert commits"
  ON task_commits FOR INSERT
  WITH CHECK (true);

-- ============================================
-- project_deployments policies
-- ============================================

-- Policy: Membros do workspace podem ver deployments
CREATE POLICY "Members can view deployments"
  ON project_deployments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      INNER JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = project_deployments.project_id
      AND wm.user_id = auth.uid()
    )
  );

-- Policy: Membros do workspace podem criar deployments
CREATE POLICY "Members can create deployments"
  ON project_deployments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      INNER JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = project_deployments.project_id
      AND wm.user_id = auth.uid()
    )
  );

-- Policy: Membros do workspace podem atualizar deployments
CREATE POLICY "Members can update deployments"
  ON project_deployments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      INNER JOIN workspace_members wm ON p.workspace_id = wm.workspace_id
      WHERE p.id = project_deployments.project_id
      AND wm.user_id = auth.uid()
    )
  );

-- ============================================
-- git_activities policies
-- ============================================

-- Policy: Membros do workspace podem ver atividades
CREATE POLICY "Members can view git activities"
  ON git_activities FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Sistema pode inserir atividades (via webhooks)
CREATE POLICY "System can insert git activities"
  ON git_activities FOR INSERT
  WITH CHECK (true);
