'use server'

import { revalidatePath } from 'next/cache'
import { v4 as uuidv4 } from 'uuid'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { createAuditLog, getProjectWorkspaceId } from '@/lib/workspace-access'
import { workspaceHasFeature } from '@/lib/workspace-features'

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, role: null }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return { supabase, user, role: profile?.role ?? null }
}

async function ensurePublicPortalFeature(supabase: Awaited<ReturnType<typeof createClient>>, projectId: string) {
  const { workspaceId, error } = await getProjectWorkspaceId(supabase, projectId)
  if (error) return { workspaceId: null, error: error.message }
  if (!workspaceId) return { workspaceId: null, error: 'Workspace do projeto nao encontrado' }

  const access = await workspaceHasFeature(supabase, workspaceId, 'public_portal')
  if (!access.allowed) return { workspaceId, error: access.error ?? 'Portal publico indisponivel no plano atual' }

  return { workspaceId, error: null }
}

export async function generatePublicToken(projectId: string) {
  const { supabase, user, role } = await requireAdmin()
  if (!user) return { error: 'Nao autenticado' }
  if (role !== 'admin') return { error: 'Acesso negado' }
  const featureAccess = await ensurePublicPortalFeature(supabase, projectId)
  if (featureAccess.error) return { error: featureAccess.error }

  const token = uuidv4()
  const { error } = await supabase
    .from('projects')
    .update({
      public_token: token,
      public_enabled: true,
    })
    .eq('id', projectId)

  if (error) return { error: error.message }

  await createAuditLog(supabase, {
    workspaceId: featureAccess.workspaceId,
    actorUserId: user.id,
    entityType: 'project',
    entityId: projectId,
    action: 'public_portal.token_generated',
    metadata: { publicEnabled: true },
  })

  revalidatePath(`/projects/${projectId}`)
  return { success: true, token }
}

export async function togglePublicPortal(projectId: string, enabled: boolean) {
  const { supabase, user, role } = await requireAdmin()
  if (!user) return { error: 'Nao autenticado' }
  if (role !== 'admin') return { error: 'Acesso negado' }
  const featureAccess = await ensurePublicPortalFeature(supabase, projectId)
  if (featureAccess.error) return { error: featureAccess.error }

  const { error } = await supabase.from('projects').update({ public_enabled: enabled }).eq('id', projectId)
  if (error) return { error: error.message }

  await createAuditLog(supabase, {
    workspaceId: featureAccess.workspaceId,
    actorUserId: user.id,
    entityType: 'project',
    entityId: projectId,
    action: enabled ? 'public_portal.enabled' : 'public_portal.disabled',
    metadata: { publicEnabled: enabled },
  })

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function revokePublicToken(projectId: string) {
  const { supabase, user, role } = await requireAdmin()
  if (!user) return { error: 'Nao autenticado' }
  if (role !== 'admin') return { error: 'Acesso negado' }
  const featureAccess = await ensurePublicPortalFeature(supabase, projectId)
  if (featureAccess.error) return { error: featureAccess.error }

  const { error } = await supabase
    .from('projects')
    .update({
      public_token: null,
      public_enabled: false,
    })
    .eq('id', projectId)

  if (error) return { error: error.message }

  await createAuditLog(supabase, {
    workspaceId: featureAccess.workspaceId,
    actorUserId: user.id,
    entityType: 'project',
    entityId: projectId,
    action: 'public_portal.token_revoked',
    metadata: { publicEnabled: false },
  })

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function getProjectByPublicToken(token: string) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      clients(name, logo_url)
    `)
    .eq('public_token', token)
    .eq('public_enabled', true)
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function getPublicProjectTasks(token: string) {
  const supabase = createAdminClient()

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('public_token', token)
    .eq('public_enabled', true)
    .single()

  if (!project) return { data: [], error: 'Projeto nao encontrado' }

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', project.id)
    .order('order_index')

  if (error) return { data: [], error: error.message }
  return { data: data ?? [], error: null }
}

export async function getPublicProjectDocuments(token: string) {
  const supabase = createAdminClient()

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('public_token', token)
    .eq('public_enabled', true)
    .single()

  if (!project) return { data: [], error: 'Projeto nao encontrado' }

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('project_id', project.id)
    .order('created_at', { ascending: false })

  if (error) return { data: [], error: error.message }
  return { data: data ?? [], error: null }
}

export async function approveTaskByToken(token: string, taskId: string) {
  const supabase = createAdminClient()

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('public_token', token)
    .eq('public_enabled', true)
    .single()

  if (!project) return { error: 'Nao autorizado' }

  const { data: task } = await supabase
    .from('tasks')
    .select('id, owner_type')
    .eq('id', taskId)
    .eq('project_id', project.id)
    .single()

  if (!task || task.owner_type !== 'client') return { error: 'Tarefa invalida' }

  const { error } = await supabase
    .from('tasks')
    .update({ status: 'done', updated_at: new Date().toISOString() })
    .eq('id', taskId)

  if (error) return { error: error.message }

  revalidatePath(`/p/${token}`)
  return { success: true }
}

export async function requestRevisionByToken(token: string, taskId: string, feedback: string) {
  const supabase = createAdminClient()

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('public_token', token)
    .eq('public_enabled', true)
    .single()

  if (!project) return { error: 'Nao autorizado' }

  const { data: task } = await supabase
    .from('tasks')
    .select('id, owner_type, description')
    .eq('id', taskId)
    .eq('project_id', project.id)
    .single()

  if (!task || task.owner_type !== 'client') return { error: 'Tarefa invalida' }

  const updatedDescription = feedback.trim()
    ? `[Revisao solicitada pelo cliente]: ${feedback.trim()}\n\n${task.description ?? ''}`.trim()
    : task.description

  const { error } = await supabase
    .from('tasks')
    .update({
      status: 'todo',
      description: updatedDescription,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)

  if (error) return { error: error.message }

  revalidatePath(`/p/${token}`)
  return { success: true }
}

export async function getPublicDocumentUrl(token: string, filePath: string) {
  const supabase = createAdminClient()

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('public_token', token)
    .eq('public_enabled', true)
    .single()

  if (!project) return { url: null, error: 'Nao autorizado' }

  const { data: document, error: documentError } = await supabase
    .from('documents')
    .select('id')
    .eq('project_id', project.id)
    .eq('file_path', filePath)
    .single()

  if (documentError || !document) {
    return { url: null, error: 'Documento nao encontrado' }
  }

  const { data, error } = await supabase.storage.from('project-files').createSignedUrl(filePath, 300)
  if (error) return { url: null, error: error.message }

  return { url: data?.signedUrl ?? null, error: null }
}
