'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getClientWorkspaceId } from '@/lib/workspace-access'
import { checkWorkspaceProjectLimit } from '@/lib/workspace-limits'
import { projectSchema, type ProjectInput } from '@/lib/validations'
import { PHASE_TEMPLATES } from '@/lib/constants'

export async function createProject(data: ProjectInput & { templateId?: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const parsed = projectSchema.safeParse(data)
  if (!parsed.success) return { error: 'Dados inválidos' }

  const { workspaceId, error: workspaceError } = await getClientWorkspaceId(supabase, parsed.data.client_id)
  if (workspaceError) return { error: workspaceError.message }
  if (!workspaceId) return { error: 'Workspace do cliente nao encontrado' }

  const projectLimitCheck = await checkWorkspaceProjectLimit(supabase, workspaceId)
  if (!projectLimitCheck.allowed) return { error: projectLimitCheck.error ?? 'Limite de projetos atingido' }

  const { data: project, error: pError } = await supabase
    .from('projects')
    .insert({
      ...parsed.data,
      created_by: user.id,
      workspace_id: workspaceId,
      status: 'active',
      health: 'green',
      progress_percent: 0,
    })
    .select()
    .single()

  if (pError) return { error: pError.message }

  // Create phases from template if provided
  if (data.templateId) {
    const { data: templateItems } = await supabase
      .from('phase_template_items')
      .select('name, order_index')
      .eq('template_id', data.templateId)
      .order('order_index', { ascending: true })

    if (templateItems && templateItems.length > 0) {
      const phases = templateItems.map((item) => ({
        project_id: project.id,
        name: item.name,
        order_index: item.order_index,
        status: 'pending',
      }))

      await supabase.from('project_phases').insert(phases)
    }
  } else {
    // Criar fases automaticamente com base no template hardcoded (fallback)
    const phases = PHASE_TEMPLATES[parsed.data.type]
    if (phases.length > 0) {
      await supabase.from('project_phases').insert(
        phases.map((phase) => ({
          project_id: project.id,
          name: phase.name,
          description: phase.description,
          order_index: phase.order_index,
        }))
      )
    }
  }

  revalidatePath('/projects')
  revalidatePath('/dashboard')
  redirect(`/projects/${project.id}`)
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  paused: 'Pausado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
}

const HEALTH_LABELS: Record<string, string> = {
  green: 'No Prazo',
  yellow: 'Atenção',
  red: 'Crítico',
}

export async function updateProject(id: string, data: Partial<ProjectInput>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  // Fetch current state to detect changes
  const { data: current } = await supabase
    .from('projects')
    .select('status, health')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('projects')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  // Log status change as internal system comment and activity
  if (current && data.status && current.status !== data.status) {
    await Promise.all([
      supabase.from('comments').insert({
        project_id: id,
        author_id: user.id,
        content: `[[system:status]] ${STATUS_LABELS[current.status] ?? current.status} → ${STATUS_LABELS[data.status] ?? data.status}`,
        is_internal: true,
      }),
      supabase.from('project_activities').insert({
        project_id: id,
        user_id: user.id,
        action: 'status_changed',
        old_value: current.status,
        new_value: data.status,
      })
    ])
  }

  // Log health change as internal system comment and activity
  if (current && data.health && current.health !== data.health) {
    await Promise.all([
      supabase.from('comments').insert({
        project_id: id,
        author_id: user.id,
        content: `[[system:health]] ${HEALTH_LABELS[current.health] ?? current.health} → ${HEALTH_LABELS[data.health] ?? data.health}`,
        is_internal: true,
      }),
      supabase.from('project_activities').insert({
        project_id: id,
        user_id: user.id,
        action: 'health_changed',
        old_value: current.health,
        new_value: data.health,
      })
    ])
  }

  revalidatePath(`/projects/${id}`)
  revalidatePath('/projects')
  revalidatePath('/dashboard')
  revalidatePath(`/projects/${id}/activity`)
  return { success: true }
}

export async function getProjectProgress(projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { percent: 0 }

  const { data: tasks } = await supabase
    .from('tasks')
    .select('status')
    .eq('project_id', projectId)

  if (!tasks || tasks.length === 0) return { percent: 0 }

  const done = tasks.filter((t) => t.status === 'done').length
  return { percent: Math.round((done / tasks.length) * 100) }
}

export async function deleteProject(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/projects')
  revalidatePath('/dashboard')
  redirect('/projects')
}
