'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Schema para integração Git
const gitIntegrationSchema = z.object({
  workspaceId: z.string().uuid(),
  provider: z.enum(['github', 'gitlab', 'bitbucket']),
  name: z.string().min(1).max(100),
  oauthToken: z.string().min(1),
  refreshToken: z.string().optional(),
  tokenExpiresAt: z.string().datetime().optional(),
})

// Schema para repositório
const repositorySchema = z.object({
  projectId: z.string().uuid(),
  integrationId: z.string().uuid(),
  providerRepoId: z.string(),
  repoName: z.string(),
  repoUrl: z.string().url(),
  defaultBranch: z.string().optional(),
  isPrimary: z.boolean().optional(),
  autoLinkBranches: z.boolean().optional(),
  autoLinkPrs: z.boolean().optional(),
  autoLinkCommits: z.boolean().optional(),
})

/**
 * Cria uma nova integração com provedor Git
 */
export async function createGitIntegration(data: z.infer<typeof gitIntegrationSchema>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Não autenticado' }
  }

  const parsed = gitIntegrationSchema.safeParse(data)
  if (!parsed.success) {
    return { error: 'Dados inválidos', details: parsed.error.issues }
  }

  // Verificar se usuário é admin do workspace
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', data.workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return { error: 'Permissão negada. Apenas admins podem criar integrações.' }
  }

  const { data: integration, error } = await supabase
    .from('git_integrations')
    .insert({
      workspace_id: data.workspaceId,
      provider: data.provider,
      name: data.name,
      oauth_token: data.oauthToken,
      refresh_token: data.refreshToken,
      token_expires_at: data.tokenExpiresAt,
      created_by: user.id,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/settings/integrations')
  return { success: true, integration }
}

/**
 * Atualiza uma integração Git existente
 */
export async function updateGitIntegration(
  integrationId: string,
  data: Partial<{
    name: string
    oauthToken: string
    refreshToken: string
    tokenExpiresAt: string
    isActive: boolean
  }>
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Não autenticado' }
  }

  // Obter integração atual para verificar permissões
  const { data: current } = await supabase
    .from('git_integrations')
    .select('workspace_id')
    .eq('id', integrationId)
    .single()

  if (!current) {
    return { error: 'Integração não encontrada' }
  }

  // Verificar permissão de admin
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', current.workspace_id)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return { error: 'Permissão negada' }
  }

  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  }

  if (data.name !== undefined) updateData.name = data.name
  if (data.oauthToken !== undefined) updateData.oauth_token = data.oauthToken
  if (data.refreshToken !== undefined) updateData.refresh_token = data.refreshToken
  if (data.tokenExpiresAt !== undefined) updateData.token_expires_at = data.tokenExpiresAt
  if (data.isActive !== undefined) updateData.is_active = data.isActive

  const { error } = await supabase
    .from('git_integrations')
    .update(updateData)
    .eq('id', integrationId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/settings/integrations')
  return { success: true }
}

/**
 * Remove uma integração Git
 */
export async function deleteGitIntegration(integrationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Não autenticado' }
  }

  const { data: current } = await supabase
    .from('git_integrations')
    .select('workspace_id')
    .eq('id', integrationId)
    .single()

  if (!current) {
    return { error: 'Integração não encontrada' }
  }

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', current.workspace_id)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return { error: 'Permissão negada' }
  }

  const { error } = await supabase
    .from('git_integrations')
    .delete()
    .eq('id', integrationId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/settings/integrations')
  return { success: true }
}

/**
 * Lista integrações de um workspace
 */
export async function listGitIntegrations(workspaceId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('git_integrations')
    .select('id, workspace_id, provider, name, is_active, created_at, updated_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) {
    return { error: error.message, integrations: [] }
  }

  return { integrations: data || [] }
}

/**
 * Adiciona um repositório a um projeto
 */
export async function addRepositoryToProject(data: z.infer<typeof repositorySchema>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Não autenticado' }
  }

  const parsed = repositorySchema.safeParse(data)
  if (!parsed.success) {
    return { error: 'Dados inválidos', details: parsed.error.issues }
  }

  // Verificar se usuário tem acesso ao projeto
  const { data: project } = await supabase
    .from('projects')
    .select('workspace_id')
    .eq('id', data.projectId)
    .single()

  if (!project) {
    return { error: 'Projeto não encontrado' }
  }

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', project.workspace_id)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return { error: 'Acesso negado ao projeto' }
  }

  const { data: repository, error } = await supabase
    .from('project_repositories')
    .insert({
      project_id: data.projectId,
      integration_id: data.integrationId,
      provider_repo_id: data.providerRepoId,
      repo_name: data.repoName,
      repo_url: data.repoUrl,
      default_branch: data.defaultBranch || 'main',
      is_primary: data.isPrimary ?? true,
      auto_link_branches: data.autoLinkBranches ?? true,
      auto_link_prs: data.autoLinkPrs ?? true,
      auto_link_commits: data.autoLinkCommits ?? true,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/projects/${data.projectId}`)
  revalidatePath(`/projects/${data.projectId}/settings`)
  return { success: true, repository }
}

/**
 * Lista repositórios de um projeto
 */
export async function listProjectRepositories(projectId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('project_repositories')
    .select(`
      id,
      project_id,
      integration_id,
      provider_repo_id,
      repo_name,
      repo_url,
      default_branch,
      is_primary,
      auto_link_branches,
      auto_link_prs,
      auto_link_commits,
      last_synced_at,
      created_at,
      git_integrations (
        provider,
        name
      )
    `)
    .eq('project_id', projectId)
    .order('is_primary', { ascending: false })

  if (error) {
    return { error: error.message, repositories: [] }
  }

  return { repositories: data || [] }
}

/**
 * Remove um repositório de um projeto
 */
export async function removeRepositoryFromProject(repositoryId: string, projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Não autenticado' }
  }

  const { data: project } = await supabase.from('projects').select('workspace_id').eq('id', projectId).single()
  if (!project) return { error: 'Projeto não encontrado' }

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', project.workspace_id)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return { error: 'Permissão negada' }
  }

  const { error } = await supabase
    .from('project_repositories')
    .delete()
    .eq('id', repositoryId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

/**
 * Registra um commit manualmente (para uso via webhook ou API)
 */
export async function registerCommit(data: {
  projectId: string
  repositoryId: string
  taskId?: string
  commitSha: string
  commitMessage: string
  commitUrl: string
  authorName?: string
  authorEmail?: string
  authorAvatar?: string
  committedAt: string
  filesChanged?: number
  additions?: number
  deletions?: number
}) {
  const supabase = await createClient()

  const { data: commit, error } = await supabase
    .from('task_commits')
    .insert({
      project_id: data.projectId,
      repository_id: data.repositoryId,
      task_id: data.taskId,
      commit_sha: data.commitSha,
      commit_message: data.commitMessage,
      commit_url: data.commitUrl,
      author_name: data.authorName,
      author_email: data.authorEmail,
      author_avatar: data.authorAvatar,
      committed_at: data.committedAt,
      files_changed: data.filesChanged ?? 0,
      additions: data.additions ?? 0,
      deletions: data.deletions ?? 0,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Se associado a uma tarefa, atualizar contagem de commits
  if (data.taskId) {
    try {
      await supabase.rpc('increment_task_commits_count', { task_id: data.taskId })
    } catch { /* Ignorar se a RPC não existir */ }
  }

  revalidatePath(`/projects/${data.projectId}`)
  if (data.taskId) {
    revalidatePath(`/projects/${data.projectId}/tasks`)
  }

  return { success: true, commit }
}

/**
 * Lista commits de um projeto ou tarefa
 */
export async function listCommits(options: {
  projectId?: string
  taskId?: string
  limit?: number
}) {
  const supabase = await createClient()
  
  let query = supabase
    .from('task_commits')
    .select(`
      id,
      task_id,
      project_id,
      repository_id,
      commit_sha,
      commit_message,
      commit_url,
      author_name,
      author_email,
      author_avatar,
      committed_at,
      files_changed,
      additions,
      deletions,
      created_at,
      project_repositories (
        repo_name,
        git_integrations (
          provider
        )
      )
    `)
    .order('committed_at', { ascending: false })

  if (options.taskId) {
    query = query.eq('task_id', options.taskId)
  } else if (options.projectId) {
    query = query.eq('project_id', options.projectId)
  }

  if (options.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query

  if (error) {
    return { error: error.message, commits: [] }
  }

  return { commits: data || [] }
}

/**
 * Registra/Atualiza um deployment
 */
export async function registerDeployment(data: {
  projectId: string
  repositoryId?: string
  environment: 'development' | 'staging' | 'production' | 'preview'
  deploymentUrl?: string
  status: 'pending' | 'building' | 'success' | 'failure' | 'cancelled'
  commitSha?: string
  branchName?: string
  startedAt?: string
  completedAt?: string
  durationSeconds?: number
  logsUrl?: string
  errorMessage?: string
  metadata?: Record<string, any>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: deployment, error } = await supabase
    .from('project_deployments')
    .insert({
      project_id: data.projectId,
      repository_id: data.repositoryId,
      environment: data.environment,
      deployment_url: data.deploymentUrl,
      status: data.status,
      commit_sha: data.commitSha,
      branch_name: data.branchName,
      deployed_by: user?.id,
      started_at: data.startedAt,
      completed_at: data.completedAt,
      duration_seconds: data.durationSeconds,
      logs_url: data.logsUrl,
      error_message: data.errorMessage,
      metadata: data.metadata ?? {},
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/projects/${data.projectId}`)
  revalidatePath(`/projects/${data.projectId}/execution`)
  
  return { success: true, deployment }
}

/**
 * Lista deployments de um projeto
 */
export async function listDeployments(projectId: string, limit: number = 20) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('project_deployments')
    .select(`
      id,
      project_id,
      repository_id,
      environment,
      deployment_url,
      status,
      commit_sha,
      branch_name,
      deployed_by,
      started_at,
      completed_at,
      duration_seconds,
      logs_url,
      error_message,
      metadata,
      created_at,
      profiles (
        full_name,
        avatar_url
      )
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    return { error: error.message, deployments: [] }
  }

  return { deployments: data || [] }
}

/**
 * Vincula uma branch a uma tarefa
 */
export async function linkBranchToTask(data: {
  taskId: string
  repositoryId: string
  branchName: string
  prNumber?: number
  prUrl?: string
  prStatus?: 'open' | 'closed' | 'merged' | 'draft'
  prTitle?: string
}) {
  const supabase = await createClient()

  const { data: branch, error } = await supabase
    .from('task_branches')
    .insert({
      task_id: data.taskId,
      repository_id: data.repositoryId,
      branch_name: data.branchName,
      pr_number: data.prNumber,
      pr_url: data.prUrl,
      pr_status: data.prStatus,
      pr_title: data.prTitle,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/projects/(id)/tasks`)
  
  return { success: true, branch }
}

/**
 * Atualiza informações de PR/Branch
 */
export async function updateBranchInfo(branchId: string, data: {
  prStatus?: 'open' | 'closed' | 'merged' | 'draft'
  prTitle?: string
  commitsCount?: number
  lastCommitAt?: string
  lastCommitSha?: string
  isMerged?: boolean
  mergedAt?: string
}) {
  const supabase = await createClient()

  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  }

  if (data.prStatus !== undefined) updateData.pr_status = data.prStatus
  if (data.prTitle !== undefined) updateData.pr_title = data.prTitle
  if (data.commitsCount !== undefined) updateData.commits_count = data.commitsCount
  if (data.lastCommitAt !== undefined) updateData.last_commit_at = data.lastCommitAt
  if (data.lastCommitSha !== undefined) updateData.last_commit_sha = data.lastCommitSha
  if (data.isMerged !== undefined) updateData.is_merged = data.isMerged
  if (data.mergedAt !== undefined) updateData.merged_at = data.mergedAt

  const { error } = await supabase
    .from('task_branches')
    .update(updateData)
    .eq('id', branchId)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

/**
 * Lista branches vinculadas a uma tarefa
 */
export async function listTaskBranches(taskId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('task_branches')
    .select(`
      id,
      task_id,
      repository_id,
      branch_name,
      pr_number,
      pr_url,
      pr_status,
      pr_title,
      commits_count,
      last_commit_at,
      last_commit_sha,
      is_merged,
      merged_at,
      created_at,
      project_repositories (
        repo_name,
        repo_url,
        git_integrations (
          provider
        )
      )
    `)
    .eq('task_id', taskId)

  if (error) {
    return { error: error.message, branches: [] }
  }

  return { branches: data || [] }
}
