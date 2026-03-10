'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  projectRiskSchema,
  taskDependencySchema,
  teamCapacitySchema,
  type ProjectRiskInput,
  type TeamCapacityInput,
} from '@/lib/validations'

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, role: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return { supabase, user, role: profile?.role ?? null }
}

export async function getProjectExecutionData(projectId: string) {
  const { supabase, user } = await requireUser()
  if (!user) {
    return {
      error: 'Nao autenticado',
      tasks: [],
      dependencies: [],
      risks: [],
      capacities: [],
      teamMembers: [],
    }
  }

  const { data: taskIds } = await supabase.from('tasks').select('id').eq('project_id', projectId)
  const dependencyTaskIds = (taskIds ?? []).map((task) => task.id)

  const [tasksRes, dependenciesRes, risksRes, capacitiesRes, teamRes] = await Promise.all([
    supabase
      .from('tasks')
      .select('id, title, status, blocked_reason, blocked_since, remaining_hours, estimated_hours, actual_hours, assignee_id, assignee:profiles!tasks_assignee_id_fkey(id, full_name)')
      .eq('project_id', projectId)
      .order('title'),
    dependencyTaskIds.length > 0
      ? supabase
          .from('task_dependencies')
          .select('*, task:tasks!task_dependencies_task_id_fkey(id, title), dependency:tasks!task_dependencies_depends_on_task_id_fkey(id, title)')
          .in('task_id', dependencyTaskIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from('project_risks')
      .select('*, owner:profiles!project_risks_owner_id_fkey(id, full_name)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false }),
    supabase
      .from('team_capacity')
      .select('*, user:profiles!team_capacity_user_id_fkey(id, full_name)')
      .order('week_start', { ascending: false })
      .limit(20),
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'admin')
      .order('full_name'),
  ])

  const normalizedTasks = (tasksRes.data ?? []).map((task) => ({
    ...task,
    assignee: Array.isArray(task.assignee) ? task.assignee[0] ?? null : task.assignee ?? null,
  }))

  const normalizedDependencies = (dependenciesRes.data ?? []).map((dependency) => ({
    ...dependency,
    task: Array.isArray(dependency.task) ? dependency.task[0] ?? null : dependency.task ?? null,
    dependency: Array.isArray(dependency.dependency) ? dependency.dependency[0] ?? null : dependency.dependency ?? null,
  }))

  const normalizedRisks = (risksRes.data ?? []).map((risk) => ({
    ...risk,
    owner: Array.isArray(risk.owner) ? risk.owner[0] ?? null : risk.owner ?? null,
  }))

  const normalizedCapacities = (capacitiesRes.data ?? []).map((capacity) => ({
    ...capacity,
    user: Array.isArray(capacity.user) ? capacity.user[0] ?? null : capacity.user ?? null,
  }))

  return {
    error: null,
    tasks: normalizedTasks,
    dependencies: normalizedDependencies,
    risks: normalizedRisks,
    capacities: normalizedCapacities,
    teamMembers: teamRes.data ?? [],
  }
}

export async function createTaskDependency(projectId: string, taskId: string, dependsOnTaskId: string) {
  const { supabase, user, role } = await requireUser()
  if (!user) return { error: 'Nao autenticado' }
  if (role !== 'admin') return { error: 'Acesso negado' }

  const parsed = taskDependencySchema.safeParse({ task_id: taskId, depends_on_task_id: dependsOnTaskId })
  if (!parsed.success) return { error: 'Dados invalidos' }

  const { error } = await supabase
    .from('task_dependencies')
    .insert({
      ...parsed.data,
      created_by: user.id,
    })

  if (error) return { error: error.message }

  revalidatePath(`/projects/${projectId}/execution`)
  revalidatePath(`/projects/${projectId}/tasks`)
  return { success: true }
}

export async function removeTaskDependency(projectId: string, dependencyId: string) {
  const { supabase, user, role } = await requireUser()
  if (!user) return { error: 'Nao autenticado' }
  if (role !== 'admin') return { error: 'Acesso negado' }

  const { error } = await supabase
    .from('task_dependencies')
    .delete()
    .eq('id', dependencyId)

  if (error) return { error: error.message }

  revalidatePath(`/projects/${projectId}/execution`)
  revalidatePath(`/projects/${projectId}/tasks`)
  return { success: true }
}

export async function createProjectRisk(projectId: string, data: ProjectRiskInput) {
  const { supabase, user, role } = await requireUser()
  if (!user) return { error: 'Nao autenticado' }
  if (role !== 'admin') return { error: 'Acesso negado' }

  const parsed = projectRiskSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados invalidos' }

  const { error } = await supabase
    .from('project_risks')
    .insert({
      project_id: projectId,
      created_by: user.id,
      ...parsed.data,
    })

  if (error) return { error: error.message }

  revalidatePath(`/projects/${projectId}/execution`)
  revalidatePath(`/projects/${projectId}/productivity`)
  return { success: true }
}

export async function updateProjectRiskStatus(
  projectId: string,
  riskId: string,
  status: 'open' | 'mitigating' | 'closed'
) {
  const { supabase, user, role } = await requireUser()
  if (!user) return { error: 'Nao autenticado' }
  if (role !== 'admin') return { error: 'Acesso negado' }

  const { error } = await supabase
    .from('project_risks')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', riskId)
    .eq('project_id', projectId)

  if (error) return { error: error.message }

  revalidatePath(`/projects/${projectId}/execution`)
  revalidatePath(`/projects/${projectId}/productivity`)
  return { success: true }
}

export async function upsertTeamCapacity(data: TeamCapacityInput) {
  const { supabase, user, role } = await requireUser()
  if (!user) return { error: 'Nao autenticado' }
  if (role !== 'admin') return { error: 'Acesso negado' }

  const parsed = teamCapacitySchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados invalidos' }

  const { error } = await supabase
    .from('team_capacity')
    .upsert({
      ...parsed.data,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,week_start' })

  if (error) return { error: error.message }

  revalidatePath('/team')
  revalidatePath('/dashboard')
  return { success: true }
}
