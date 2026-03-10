'use server'

import { createClient } from '@/lib/supabase/server'

type ProjectRow = {
  id: string
  name: string
  type: string
  status: string
  health: string
  progress_percent: number | null
  created_at: string
  target_end_date: string | null
  margin_percent: number | null
  clients: { name: string } | null
}

type TaskRow = {
  project_id: string | null
  status: string
  due_date: string | null
  blocked_reason: string | null
  assignee_id: string | null
  estimated_hours: number | null
  actual_hours: number | null
}

type ApprovalRow = {
  project_id: string
  status: string
}

type RiskRow = {
  project_id: string
  status: string
}

type TimeEntryRow = {
  project_id: string
  user_id: string
  hours: number
  entry_date: string
}

type CapacityRow = {
  user_id: string
  capacity_hours: number
}

type CostSnapshotRow = {
  project_id: string
  internal_cost: number
  recognized_revenue: number
  snapshot_date: string
}

type ProjectMetricsInsert = {
  project_id: string
  health_score: number
  blocked_tasks_count: number
  pending_approvals_count: number
  open_risks_count: number
  overdue_tasks_count: number
  workload_alert: boolean
}

type DeliveryForecastInsert = {
  project_id: string
  projected_completion_date: string | null
  projected_delay_days: number
  confidence_score: number
  rationale: string
}

type ProjectHealthSummary = {
  id: string
  name: string
  clientName: string | null
  type: string
  score: number
  band: 'green' | 'yellow' | 'red'
  blockedTasksCount: number
  pendingApprovalsCount: number
  openRisksCount: number
  overdueTasksCount: number
  workloadAlert: boolean
  projectedCompletionDate: string | null
  projectedDelayDays: number
  confidenceScore: number
  rationale: string
}

const MS_PER_DAY = 86_400_000

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function toISODate(value: Date) {
  return value.toISOString().split('T')[0]
}

function differenceInDays(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY)
}

function scoreToBand(score: number): 'green' | 'yellow' | 'red' {
  if (score >= 80) return 'green'
  if (score >= 55) return 'yellow'
  return 'red'
}

function buildForecast(
  project: ProjectRow,
  metrics: ProjectMetricsInsert,
  marginPressure: boolean,
  today: Date,
): DeliveryForecastInsert {
  const reasons: string[] = []
  if (metrics.blocked_tasks_count > 0) {
    reasons.push(`${metrics.blocked_tasks_count} bloqueio(s) ativo(s)`)
  }
  if (metrics.open_risks_count > 0) {
    reasons.push(`${metrics.open_risks_count} risco(s) em aberto`)
  }
  if (metrics.pending_approvals_count > 0) {
    reasons.push(`${metrics.pending_approvals_count} aprovacao(oes) pendente(s)`)
  }
  if (metrics.overdue_tasks_count > 0) {
    reasons.push(`${metrics.overdue_tasks_count} tarefa(s) atrasada(s)`)
  }
  if (metrics.workload_alert) {
    reasons.push('sobrecarga detectada na equipe')
  }
  if (marginPressure) {
    reasons.push('margem abaixo da meta')
  }

  const createdAt = new Date(project.created_at)
  const progress = clamp(project.progress_percent ?? 0, 0, 100)
  const daysElapsed = Math.max(differenceInDays(createdAt, today), 1)

  let projectedCompletionDate = project.target_end_date
  if (progress > 0 && progress < 100) {
    const projectedTotalDays = Math.ceil(daysElapsed / (progress / 100))
    projectedCompletionDate = toISODate(new Date(createdAt.getTime() + projectedTotalDays * MS_PER_DAY))
  } else if (progress >= 100) {
    projectedCompletionDate = toISODate(today)
  }

  let projectedDelayDays = 0
  if (project.target_end_date && projectedCompletionDate) {
    projectedDelayDays = Math.max(
      differenceInDays(new Date(project.target_end_date), new Date(projectedCompletionDate)),
      0,
    )
  }

  if (!projectedCompletionDate && project.target_end_date) {
    projectedCompletionDate = project.target_end_date
  }

  let confidenceScore = 92
  confidenceScore -= metrics.blocked_tasks_count * 8
  confidenceScore -= metrics.open_risks_count * 7
  confidenceScore -= metrics.pending_approvals_count * 4
  confidenceScore -= metrics.overdue_tasks_count * 6
  confidenceScore -= metrics.workload_alert ? 14 : 0
  confidenceScore -= marginPressure ? 10 : 0
  confidenceScore -= projectedDelayDays > 0 ? Math.min(projectedDelayDays * 2, 18) : 0

  return {
    project_id: project.id,
    projected_completion_date: projectedCompletionDate,
    projected_delay_days: projectedDelayDays,
    confidence_score: clamp(confidenceScore, 5, 100),
    rationale: reasons.length > 0 ? reasons.join(' | ') : 'operacao dentro do esperado',
  }
}

function buildMetrics(
  project: ProjectRow,
  tasks: TaskRow[],
  approvals: ApprovalRow[],
  risks: RiskRow[],
  hoursByProfile: Map<string, number>,
  capacityByProfile: Map<string, number>,
  latestSnapshot: CostSnapshotRow | undefined,
  today: Date,
): { metrics: ProjectMetricsInsert; marginPressure: boolean } {
  const blockedTasksCount = tasks.filter(
    (task) => task.status !== 'done' && Boolean(task.blocked_reason?.trim()),
  ).length
  const overdueTasksCount = tasks.filter(
    (task) =>
      task.status !== 'done' &&
      Boolean(task.due_date) &&
      new Date(task.due_date as string).getTime() < today.getTime(),
  ).length
  const pendingApprovalsCount = approvals.filter((approval) => approval.status === 'pending').length
  const openRisksCount = risks.filter((risk) => risk.status !== 'closed').length

  const workloadAlert = tasks.some((task) => {
    if (!task.assignee_id) return false
    const capacity = capacityByProfile.get(task.assignee_id) ?? 40
    const loggedHours = hoursByProfile.get(task.assignee_id) ?? 0
    return loggedHours > capacity
  })

  const targetMargin = project.margin_percent ?? 0
  const grossMarginPercent =
    latestSnapshot && latestSnapshot.recognized_revenue > 0
      ? ((latestSnapshot.recognized_revenue - latestSnapshot.internal_cost) /
          latestSnapshot.recognized_revenue) *
        100
      : null
  const marginPressure =
    grossMarginPercent !== null &&
    targetMargin > 0 &&
    grossMarginPercent < targetMargin - 5

  let healthScore = 100
  healthScore -= blockedTasksCount * 12
  healthScore -= openRisksCount * 10
  healthScore -= overdueTasksCount * 8
  healthScore -= pendingApprovalsCount * 6
  healthScore -= workloadAlert ? 14 : 0
  healthScore -= marginPressure ? 12 : 0

  return {
    metrics: {
      project_id: project.id,
      health_score: clamp(healthScore, 0, 100),
      blocked_tasks_count: blockedTasksCount,
      pending_approvals_count: pendingApprovalsCount,
      open_risks_count: openRisksCount,
      overdue_tasks_count: overdueTasksCount,
      workload_alert: workloadAlert,
    },
    marginPressure,
  }
}

async function persistDailyPredictiveData(
  projects: ProjectHealthSummary[],
  metricsMap: Map<string, ProjectMetricsInsert>,
  forecastMap: Map<string, DeliveryForecastInsert>,
) {
  if (projects.length === 0) return

  const supabase = await createClient()
  const today = toISODate(new Date())
  const projectIds = projects.map((project) => project.id)

  const [{ data: existingMetrics }, { data: existingForecasts }] = await Promise.all([
    supabase
      .from('project_metrics_snapshots')
      .select('project_id')
      .eq('snapshot_date', today)
      .in('project_id', projectIds),
    supabase
      .from('delivery_forecasts')
      .select('project_id')
      .eq('forecast_date', today)
      .in('project_id', projectIds),
  ])

  const existingMetricsIds = new Set((existingMetrics ?? []).map((item) => item.project_id))
  const existingForecastIds = new Set((existingForecasts ?? []).map((item) => item.project_id))

  const metricsInserts = projects
    .filter((project) => !existingMetricsIds.has(project.id))
    .map((project) => ({
      ...metricsMap.get(project.id)!,
      snapshot_date: today,
    }))

  const forecastInserts = projects
    .filter((project) => !existingForecastIds.has(project.id))
    .map((project) => ({
      ...forecastMap.get(project.id)!,
      forecast_date: today,
    }))

  if (metricsInserts.length > 0) {
    await supabase.from('project_metrics_snapshots').insert(metricsInserts)
  }

  if (forecastInserts.length > 0) {
    await supabase.from('delivery_forecasts').insert(forecastInserts)
  }
}

export async function getAdminAnalytics() {
  const supabase = await createClient()
  const today = new Date()
  const todayIso = toISODate(today)
  const weekAgoIso = toISODate(new Date(today.getTime() - 7 * MS_PER_DAY))

  const [
    { count: totalProjects },
    { count: totalClients },
    { count: totalTasks },
    { data: projectsByType },
    { data: recentActivities },
    { data: projectsData },
    { data: tasksData },
    { data: approvalsData },
    { data: risksData },
    { data: timeEntriesData },
    { data: capacityData },
    { data: costSnapshotsData },
  ] = await Promise.all([
    supabase.from('projects').select('*', { count: 'exact', head: true }),
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('tasks').select('*', { count: 'exact', head: true }),
    supabase.from('projects').select('type'),
    supabase
      .from('project_activities')
      .select('*, user:profiles(full_name, avatar_url, role), project:projects(name)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('projects')
      .select(
        'id, name, type, status, health, progress_percent, created_at, target_end_date, margin_percent, clients(name)',
      )
      .neq('status', 'cancelled'),
    supabase
      .from('tasks')
      .select('project_id, status, due_date, blocked_reason, assignee_id, estimated_hours, actual_hours'),
    supabase.from('approvals').select('project_id, status'),
    supabase.from('project_risks').select('project_id, status'),
    supabase
      .from('time_entries')
      .select('project_id, user_id, hours, entry_date')
      .gte('entry_date', weekAgoIso)
      .lte('entry_date', todayIso),
    supabase
      .from('team_capacity')
      .select('user_id, capacity_hours')
      .lte('week_start', todayIso),
    supabase
      .from('project_cost_snapshots')
      .select('project_id, internal_cost, recognized_revenue, snapshot_date')
      .order('snapshot_date', { ascending: false }),
  ])

  const projects = (projectsData ?? []) as ProjectRow[]
  const tasks = (tasksData ?? []) as TaskRow[]
  const approvals = (approvalsData ?? []) as ApprovalRow[]
  const risks = (risksData ?? []) as RiskRow[]
  const timeEntries = (timeEntriesData ?? []) as TimeEntryRow[]
  const capacities = (capacityData ?? []) as CapacityRow[]
  const costSnapshots = (costSnapshotsData ?? []) as CostSnapshotRow[]

  const tasksByProject = new Map<string, TaskRow[]>()
  const approvalsByProject = new Map<string, ApprovalRow[]>()
  const risksByProject = new Map<string, RiskRow[]>()
  const latestCostSnapshotByProject = new Map<string, CostSnapshotRow>()
  const hoursByProfile = new Map<string, number>()
  const capacityByProfile = new Map<string, number>()

  for (const task of tasks) {
    if (!task.project_id) continue
    tasksByProject.set(task.project_id, [...(tasksByProject.get(task.project_id) ?? []), task])
  }

  for (const approval of approvals) {
    approvalsByProject.set(approval.project_id, [...(approvalsByProject.get(approval.project_id) ?? []), approval])
  }

  for (const risk of risks) {
    risksByProject.set(risk.project_id, [...(risksByProject.get(risk.project_id) ?? []), risk])
  }

  for (const entry of timeEntries) {
    hoursByProfile.set(entry.user_id, (hoursByProfile.get(entry.user_id) ?? 0) + entry.hours)
  }

  for (const capacity of capacities) {
    if (!capacityByProfile.has(capacity.user_id)) {
      capacityByProfile.set(capacity.user_id, capacity.capacity_hours)
    }
  }

  for (const snapshot of costSnapshots) {
    if (!latestCostSnapshotByProject.has(snapshot.project_id)) {
      latestCostSnapshotByProject.set(snapshot.project_id, snapshot)
    }
  }

  const metricsMap = new Map<string, ProjectMetricsInsert>()
  const forecastMap = new Map<string, DeliveryForecastInsert>()

  const projectHealthSummaries: ProjectHealthSummary[] = projects
    .filter((project) => project.status === 'active')
    .map((project) => {
      const taskItems = tasksByProject.get(project.id) ?? []
      const approvalItems = approvalsByProject.get(project.id) ?? []
      const riskItems = risksByProject.get(project.id) ?? []
      const latestSnapshot = latestCostSnapshotByProject.get(project.id)
      const { metrics, marginPressure } = buildMetrics(
        project,
        taskItems,
        approvalItems,
        riskItems,
        hoursByProfile,
        capacityByProfile,
        latestSnapshot,
        today,
      )
      const forecast = buildForecast(project, metrics, marginPressure, today)
      const band = scoreToBand(metrics.health_score)

      metricsMap.set(project.id, metrics)
      forecastMap.set(project.id, forecast)

      return {
        id: project.id,
        name: project.name,
        clientName: project.clients?.name ?? null,
        type: project.type,
        score: metrics.health_score,
        band,
        blockedTasksCount: metrics.blocked_tasks_count,
        pendingApprovalsCount: metrics.pending_approvals_count,
        openRisksCount: metrics.open_risks_count,
        overdueTasksCount: metrics.overdue_tasks_count,
        workloadAlert: metrics.workload_alert,
        projectedCompletionDate: forecast.projected_completion_date,
        projectedDelayDays: forecast.projected_delay_days,
        confidenceScore: forecast.confidence_score,
        rationale: forecast.rationale,
      }
    })
    .sort((left, right) => left.score - right.score)

  await persistDailyPredictiveData(projectHealthSummaries, metricsMap, forecastMap)

  const allTasks = tasks
  const statusCounts = allTasks.reduce<Record<string, number>>((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1
    return acc
  }, {})

  const totalEstimated = allTasks.reduce((acc, task) => acc + (task.estimated_hours ?? 0), 0)
  const totalActual = allTasks.reduce((acc, task) => acc + (task.actual_hours ?? 0), 0)
  const globalEfficiency =
    totalEstimated > 0 && totalActual > 0 ? Math.round((totalEstimated / totalActual) * 100) : 0

  const avgHealthScore =
    projectHealthSummaries.length > 0
      ? Math.round(
          projectHealthSummaries.reduce((acc, project) => acc + project.score, 0) /
            projectHealthSummaries.length,
        )
      : 0

  const atRiskProjects = projectHealthSummaries.filter(
    (project) => project.score < 55 || project.projectedDelayDays > 0 || project.workloadAlert,
  )
  const workloadAlerts = projectHealthSummaries.filter((project) => project.workloadAlert).length
  const marginPressureCount = projectHealthSummaries.filter((project) =>
    project.rationale.includes('margem abaixo da meta'),
  ).length
  const pendingApprovalsTotal = projectHealthSummaries.reduce(
    (acc, project) => acc + project.pendingApprovalsCount,
    0,
  )
  const avgProjectedDelay =
    projectHealthSummaries.length > 0
      ? Math.round(
          projectHealthSummaries.reduce((acc, project) => acc + project.projectedDelayDays, 0) /
            projectHealthSummaries.length,
        )
      : 0

  const healthDistribution = projectHealthSummaries.reduce<Record<string, number>>((acc, project) => {
    acc[project.band] = (acc[project.band] || 0) + 1
    return acc
  }, {})

  const forecastDistribution = {
    onTrack: projectHealthSummaries.filter((project) => project.projectedDelayDays === 0).length,
    minorRisk: projectHealthSummaries.filter(
      (project) => project.projectedDelayDays > 0 && project.projectedDelayDays <= 7,
    ).length,
    majorRisk: projectHealthSummaries.filter((project) => project.projectedDelayDays > 7).length,
  }

  return {
    kpis: {
      totalProjects: totalProjects ?? 0,
      totalClients: totalClients ?? 0,
      totalTasks: totalTasks ?? 0,
      globalEfficiency,
      avgHealthScore,
      atRiskProjects: atRiskProjects.length,
    },
    predictiveSummary: {
      workloadAlerts,
      marginPressureCount,
      pendingApprovalsTotal,
      avgProjectedDelay,
    },
    statusCounts,
    projectsByType: (projectsByType ?? []).reduce<Record<string, number>>((acc, project) => {
      acc[project.type] = (acc[project.type] || 0) + 1
      return acc
    }, {}),
    healthDistribution,
    forecastDistribution,
    projectHealthSummaries,
    recentActivities: recentActivities ?? [],
  }
}
