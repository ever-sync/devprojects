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

type CapacityPlanningPerson = {
  userId: string
  fullName: string
  weeklyCapacityHours: number
  horizonCapacityHours: number
  horizonAllocatedHours: number
  openTaskHours: number
  projectedHours: number
  utilizationPercent: number
  freeHours: number
  risk: 'healthy' | 'warning' | 'overloaded'
  topProjects: Array<{ projectId: string; projectName: string; hours: number }>
}
type CapacityTaskLoad = {
  project_id: string
  assignee_id: string | null
  remaining_hours: number | null
  estimated_hours: number | null
  actual_hours: number | null
}

function getWeekStartIso(base: Date) {
  const date = new Date(base)
  const day = date.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setUTCDate(date.getUTCDate() + diff)
  date.setUTCHours(0, 0, 0, 0)
  return date.toISOString().slice(0, 10)
}

function addDaysIso(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export async function getCapacityPlanningData(weeks = 4) {
  const { supabase, user, role } = await requireUser()
  if (!user) return { error: 'Nao autenticado', data: null }
  if (role !== 'admin') return { error: 'Acesso negado', data: null }

  const horizonWeeks = Math.max(1, Math.min(12, Math.floor(weeks)))
  const weekStart = getWeekStartIso(new Date())
  const weekEnd = addDaysIso(weekStart, horizonWeeks * 7 - 1)

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!membership?.workspace_id) {
    return { error: 'Workspace nao encontrado', data: null }
  }

  const workspaceId = membership.workspace_id

  const [{ data: membersRes }, { data: projectsRes }, { data: capacitiesRes }] = await Promise.all([
    supabase
      .from('workspace_members')
      .select('user_id, profiles!workspace_members_user_id_fkey(id, full_name, role)')
      .eq('workspace_id', workspaceId),
    supabase.from('projects').select('id, name').eq('workspace_id', workspaceId),
    supabase
      .from('team_capacity')
      .select('user_id, week_start, capacity_hours, allocated_hours')
      .eq('workspace_id', workspaceId)
      .gte('week_start', weekStart)
      .lte('week_start', weekEnd),
  ])

  const members = (membersRes ?? [])
    .map((member) => ({
      user_id: member.user_id,
      profile: Array.isArray(member.profiles) ? member.profiles[0] : member.profiles,
    }))
    .filter((member) => member.profile?.role === 'admin')
    .map((member) => ({
      id: member.user_id,
      full_name: member.profile?.full_name ?? 'Sem nome',
    }))

  const projectIds = (projectsRes ?? []).map((project) => project.id)
  const projectMap = new Map((projectsRes ?? []).map((project) => [project.id, project.name]))

  const { data: tasksRes } = projectIds.length
    ? await supabase
        .from('tasks')
        .select('project_id, assignee_id, status, remaining_hours, estimated_hours, actual_hours')
        .in('project_id', projectIds)
        .not('assignee_id', 'is', null)
        .neq('status', 'done')
    : { data: [] as CapacityTaskLoad[] }

  const memberIds = new Set(members.map((member) => member.id))
  const capacities = capacitiesRes ?? []
  const tasks = ((tasksRes ?? []) as CapacityTaskLoad[]).filter(
    (task) => task.assignee_id && memberIds.has(task.assignee_id),
  )

  const rows: CapacityPlanningPerson[] = members.map((member) => {
    const personCapacities = capacities.filter((capacity) => capacity.user_id === member.id)
    const horizonCapacityHours = personCapacities.reduce((sum, item) => sum + (item.capacity_hours ?? 0), 0)
    const horizonAllocatedHours = personCapacities.reduce((sum, item) => sum + (item.allocated_hours ?? 0), 0)
    const weeklyCapacityHours =
      personCapacities.length > 0 ? horizonCapacityHours / horizonWeeks : 40

    const personTasks = tasks.filter((task) => task.assignee_id === member.id)
    const openTaskHours = personTasks.reduce((sum, task) => {
      const remaining = task.remaining_hours
      const estimated = task.estimated_hours
      const actual = task.actual_hours
      const fallback = estimated != null ? Math.max(estimated - (actual ?? 0), 0) : 0
      return sum + (remaining ?? fallback)
    }, 0)

    const byProject = new Map<string, number>()
    for (const task of personTasks) {
      const projectId = task.project_id
      if (!projectId) continue
      const remaining = task.remaining_hours
      const estimated = task.estimated_hours
      const actual = task.actual_hours
      const hours = remaining ?? (estimated != null ? Math.max(estimated - (actual ?? 0), 0) : 0)
      byProject.set(projectId, (byProject.get(projectId) ?? 0) + hours)
    }

    const topProjects = Array.from(byProject.entries())
      .map(([projectId, hours]) => ({
        projectId,
        projectName: projectMap.get(projectId) ?? 'Projeto',
        hours,
      }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 3)

    const baseCapacity = horizonCapacityHours > 0 ? horizonCapacityHours : weeklyCapacityHours * horizonWeeks
    const projectedHours = Math.max(horizonAllocatedHours, openTaskHours)
    const utilizationPercent = baseCapacity > 0 ? (projectedHours / baseCapacity) * 100 : 0
    const freeHours = baseCapacity - projectedHours
    const risk: CapacityPlanningPerson['risk'] =
      utilizationPercent > 100 ? 'overloaded' : utilizationPercent >= 85 ? 'warning' : 'healthy'

    return {
      userId: member.id,
      fullName: member.full_name,
      weeklyCapacityHours,
      horizonCapacityHours: baseCapacity,
      horizonAllocatedHours,
      openTaskHours,
      projectedHours,
      utilizationPercent,
      freeHours,
      risk,
      topProjects,
    }
  })

  const totals = rows.reduce(
    (acc, row) => {
      acc.capacity += row.horizonCapacityHours
      acc.projected += row.projectedHours
      return acc
    },
    { capacity: 0, projected: 0 },
  )

  const overloadedCount = rows.filter((row) => row.risk === 'overloaded').length
  const warningCount = rows.filter((row) => row.risk === 'warning').length
  const teamUtilization = totals.capacity > 0 ? (totals.projected / totals.capacity) * 100 : 0

  return {
    error: null,
    data: {
      horizonWeeks,
      weekStart,
      weekEnd,
      overloadedCount,
      warningCount,
      teamUtilization,
      people: rows.sort((a, b) => b.utilizationPercent - a.utilizationPercent),
    },
  }
}

type ResourceTask = {
  id: string
  title: string
  project_id: string
  project_name: string
  assignee_id: string | null
  status: string
  priority: string
  due_date: string | null
  remaining_hours: number | null
  estimated_hours: number | null
  actual_hours: number | null
}

export async function getResourceAllocationData() {
  const { supabase, user, role } = await requireUser()
  if (!user) return { error: 'Nao autenticado', data: null }
  if (role !== 'admin') return { error: 'Acesso negado', data: null }

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!membership?.workspace_id) return { error: 'Workspace nao encontrado', data: null }

  const workspaceId = membership.workspace_id

  const [{ data: membersRes }, { data: projectsRes }] = await Promise.all([
    supabase
      .from('workspace_members')
      .select('user_id, profiles!workspace_members_user_id_fkey(id, full_name, role)')
      .eq('workspace_id', workspaceId),
    supabase.from('projects').select('id, name').eq('workspace_id', workspaceId),
  ])

  const teamMembers = (membersRes ?? [])
    .map((member) => ({
      user_id: member.user_id,
      profile: Array.isArray(member.profiles) ? member.profiles[0] : member.profiles,
    }))
    .filter((member) => member.profile?.role === 'admin')
    .map((member) => ({
      id: member.user_id,
      full_name: member.profile?.full_name ?? 'Sem nome',
    }))

  const projectMap = new Map((projectsRes ?? []).map((project) => [project.id, project.name]))
  const projectIds = Array.from(projectMap.keys())

  const { data: tasksRes } = projectIds.length
    ? await supabase
        .from('tasks')
        .select('id, title, project_id, assignee_id, status, priority, due_date, remaining_hours, estimated_hours, actual_hours')
        .in('project_id', projectIds)
        .neq('status', 'done')
    : { data: [] as Array<Record<string, unknown>> }

  const tasks: ResourceTask[] = (tasksRes ?? []).map((task) => ({
    id: String(task.id),
    title: String(task.title ?? 'Sem titulo'),
    project_id: String(task.project_id),
    project_name: projectMap.get(String(task.project_id)) ?? 'Projeto',
    assignee_id: task.assignee_id ? String(task.assignee_id) : null,
    status: String(task.status ?? 'todo'),
    priority: String(task.priority ?? 'medium'),
    due_date: typeof task.due_date === 'string' ? task.due_date : null,
    remaining_hours: typeof task.remaining_hours === 'number' ? task.remaining_hours : null,
    estimated_hours: typeof task.estimated_hours === 'number' ? task.estimated_hours : null,
    actual_hours: typeof task.actual_hours === 'number' ? task.actual_hours : null,
  }))

  return {
    error: null,
    data: {
      teamMembers,
      tasks,
    },
  }
}

export async function reassignTaskAllocation(taskId: string, assigneeId: string | null) {
  const { supabase, user, role } = await requireUser()
  if (!user) return { error: 'Nao autenticado' }
  if (role !== 'admin') return { error: 'Acesso negado' }

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!membership?.workspace_id) return { error: 'Workspace nao encontrado' }

  const { data: task } = await supabase
    .from('tasks')
    .select('id, project_id')
    .eq('id', taskId)
    .single()

  if (!task?.project_id) return { error: 'Tarefa nao encontrada' }

  const { data: project } = await supabase
    .from('projects')
    .select('workspace_id')
    .eq('id', task.project_id)
    .single()

  if (!project || project.workspace_id !== membership.workspace_id) {
    return { error: 'Tarefa fora do workspace' }
  }

  if (assigneeId) {
    const { data: assigneeMember } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', membership.workspace_id)
      .eq('user_id', assigneeId)
      .limit(1)
      .single()

    if (!assigneeMember) return { error: 'Pessoa nao pertence ao workspace' }
  }

  const { error } = await supabase
    .from('tasks')
    .update({
      assignee_id: assigneeId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)

  if (error) return { error: error.message }

  revalidatePath('/team')
  revalidatePath(`/projects/${task.project_id}/tasks`)
  revalidatePath(`/projects/${task.project_id}/execution`)
  return { success: true }
}

export async function updateTaskDueDateAllocation(taskId: string, dueDate: string | null) {
  const { supabase, user, role } = await requireUser()
  if (!user) return { error: 'Nao autenticado' }
  if (role !== 'admin') return { error: 'Acesso negado' }

  if (dueDate && Number.isNaN(Date.parse(`${dueDate}T00:00:00.000Z`))) {
    return { error: 'Data invalida' }
  }

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!membership?.workspace_id) return { error: 'Workspace nao encontrado' }

  const { data: task } = await supabase
    .from('tasks')
    .select('id, project_id')
    .eq('id', taskId)
    .single()

  if (!task?.project_id) return { error: 'Tarefa nao encontrada' }

  const { data: project } = await supabase
    .from('projects')
    .select('workspace_id')
    .eq('id', task.project_id)
    .single()

  if (!project || project.workspace_id !== membership.workspace_id) {
    return { error: 'Tarefa fora do workspace' }
  }

  const { error } = await supabase
    .from('tasks')
    .update({
      due_date: dueDate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)

  if (error) return { error: error.message }

  revalidatePath('/team')
  revalidatePath(`/projects/${task.project_id}/tasks`)
  revalidatePath(`/projects/${task.project_id}/execution`)
  return { success: true }
}
