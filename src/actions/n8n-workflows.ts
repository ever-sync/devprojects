'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const snapshotSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(2).max(200),
  description: z.string().optional(),
  n8nWorkflowId: z.string().optional(),
  workflowJson: z.record(z.any()).default({}),
  environment: z.enum(['development', 'staging', 'production']).default('development'),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

const updateSnapshotSchema = snapshotSchema.partial().extend({
  id: z.string().uuid(),
})

async function getProjectWorkspace(supabase: Awaited<ReturnType<typeof createClient>>, projectId: string) {
  const { data: project } = await supabase
    .from('projects')
    .select('workspace_id')
    .eq('id', projectId)
    .single()
  return project?.workspace_id ?? null
}

export async function getN8nSnapshots(projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado', data: null }

  const { data, error } = await supabase
    .from('n8n_workflow_snapshots')
    .select(`
      *,
      creator:created_by(id, full_name, email),
      promoter:promoted_by(id, full_name, email)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message, data: null }
  return { data, error: null }
}

export async function getN8nExecutionLogs(projectId: string, snapshotId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado', data: null }

  let query = supabase
    .from('n8n_execution_logs')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (snapshotId) {
    query = query.eq('snapshot_id', snapshotId)
  }

  const { data, error } = await query
  if (error) return { error: error.message, data: null }
  return { data, error: null }
}

export async function createN8nSnapshot(input: z.infer<typeof snapshotSchema>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const parsed = snapshotSchema.safeParse(input)
  if (!parsed.success) return { error: 'Dados inválidos' }

  const workspaceId = await getProjectWorkspace(supabase, parsed.data.projectId)
  if (!workspaceId) return { error: 'Projeto não encontrado' }

  const { count } = await supabase
    .from('n8n_workflow_snapshots')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', parsed.data.projectId)

  const version = (count ?? 0) + 1

  const { data, error } = await supabase
    .from('n8n_workflow_snapshots')
    .insert({
      project_id: parsed.data.projectId,
      workspace_id: workspaceId,
      name: parsed.data.name,
      description: parsed.data.description,
      n8n_workflow_id: parsed.data.n8nWorkflowId,
      workflow_json: parsed.data.workflowJson,
      environment: parsed.data.environment,
      notes: parsed.data.notes,
      tags: parsed.data.tags ?? [],
      version,
      status: 'draft',
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/projects/${parsed.data.projectId}/n8n-workflows`)
  return { data, error: null }
}

export async function duplicateSnapshot(snapshotId: string, notes: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: parent } = await supabase
    .from('n8n_workflow_snapshots')
    .select('*')
    .eq('id', snapshotId)
    .single()

  if (!parent) return { error: 'Snapshot não encontrado' }

  const { count } = await supabase
    .from('n8n_workflow_snapshots')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', parent.project_id)

  const { data, error } = await supabase
    .from('n8n_workflow_snapshots')
    .insert({
      project_id: parent.project_id,
      workspace_id: parent.workspace_id,
      name: parent.name,
      description: parent.description,
      n8n_workflow_id: parent.n8n_workflow_id,
      workflow_json: parent.workflow_json,
      environment: parent.environment,
      notes,
      tags: parent.tags,
      version: (count ?? 0) + 1,
      status: 'draft',
      parent_version_id: snapshotId,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/projects/${parent.project_id}/n8n-workflows`)
  return { data, error: null }
}

export async function updateN8nSnapshot(input: z.infer<typeof updateSnapshotSchema>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const parsed = updateSnapshotSchema.safeParse(input)
  if (!parsed.success) return { error: 'Dados inválidos' }

  const { id, projectId, n8nWorkflowId, workflowJson, ...rest } = parsed.data

  const updatePayload: Record<string, unknown> = { ...rest }
  if (n8nWorkflowId !== undefined) updatePayload.n8n_workflow_id = n8nWorkflowId
  if (workflowJson !== undefined) updatePayload.workflow_json = workflowJson

  const { data, error } = await supabase
    .from('n8n_workflow_snapshots')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/projects/${projectId ?? data.project_id}/n8n-workflows`)
  return { data, error: null }
}

export async function promoteN8nSnapshot(
  id: string,
  targetStatus: 'staging' | 'production'
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: snapshot } = await supabase
    .from('n8n_workflow_snapshots')
    .select('project_id, workspace_id, name, n8n_workflow_id')
    .eq('id', id)
    .single()

  if (!snapshot) return { error: 'Snapshot não encontrado' }

  // Arquivar versão atual em produção/staging do mesmo workflow
  if (targetStatus === 'production') {
    await supabase
      .from('n8n_workflow_snapshots')
      .update({ status: 'archived' })
      .eq('project_id', snapshot.project_id)
      .eq('status', 'production')
      .neq('id', id)
  }

  const targetEnv = targetStatus === 'production' ? 'production' : 'staging'

  const { data, error } = await supabase
    .from('n8n_workflow_snapshots')
    .update({
      status: targetStatus,
      environment: targetEnv,
      promoted_by: user.id,
      promoted_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/projects/${snapshot.project_id}/n8n-workflows`)
  return { data, error: null }
}

export async function deleteN8nSnapshot(id: string, projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase
    .from('n8n_workflow_snapshots')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/projects/${projectId}/n8n-workflows`)
  return { error: null }
}
