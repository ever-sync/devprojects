'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

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

export async function updateProfileRates(profileId: string, hourCost: number, billRate: number) {
  const { supabase, user, role } = await requireUser()
  if (!user) return { error: 'Nao autenticado' }
  if (role !== 'admin') return { error: 'Acesso negado' }

  const { error } = await supabase
    .from('profiles')
    .update({
      hour_cost: hourCost,
      bill_rate: billRate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', profileId)

  if (error) return { error: error.message }

  revalidatePath('/team')
  return { success: true }
}

export async function getProjectMarginData(projectId: string) {
  const { supabase, user } = await requireUser()
  if (!user) {
    return {
      error: 'Nao autenticado',
      summary: null,
      snapshots: [],
    }
  }

  const [{ data: timeEntries }, { data: project }, { data: invoices }, { data: snapshots }] = await Promise.all([
    supabase
      .from('time_entries')
      .select('hours, user:profiles!time_entries_user_id_fkey(hour_cost, bill_rate)')
      .eq('project_id', projectId),
    supabase
      .from('projects')
      .select('contract_value, margin_percent')
      .eq('id', projectId)
      .single(),
    supabase
      .from('invoices')
      .select('amount, status')
      .eq('project_id', projectId),
    supabase
      .from('project_cost_snapshots')
      .select('*')
      .eq('project_id', projectId)
      .order('snapshot_date', { ascending: false })
      .limit(10),
  ])

  if (!project) {
    return {
      error: 'Projeto nao encontrado',
      summary: null,
      snapshots: [],
    }
  }

  const loggedHours = (timeEntries ?? []).reduce((sum, entry) => sum + Number(entry.hours ?? 0), 0)
  const internalCost = (timeEntries ?? []).reduce((sum, entry) => {
    const userData = Array.isArray(entry.user) ? entry.user[0] : entry.user
    return sum + Number(entry.hours ?? 0) * Number(userData?.hour_cost ?? 0)
  }, 0)
  const billableValue = (timeEntries ?? []).reduce((sum, entry) => {
    const userData = Array.isArray(entry.user) ? entry.user[0] : entry.user
    return sum + Number(entry.hours ?? 0) * Number(userData?.bill_rate ?? 0)
  }, 0)
  const recognizedRevenue = (invoices ?? [])
    .filter((invoice) => invoice.status === 'paid' || invoice.status === 'issued')
    .reduce((sum, invoice) => sum + Number(invoice.amount ?? 0), 0)
  const grossMargin = recognizedRevenue - internalCost
  const marginPercentReal = recognizedRevenue > 0 ? (grossMargin / recognizedRevenue) * 100 : null

  return {
    error: null,
    summary: {
      loggedHours,
      internalCost,
      billableValue,
      recognizedRevenue,
      grossMargin,
      marginPercentReal,
      targetMargin: project.margin_percent ?? null,
      contractValue: project.contract_value ?? null,
    },
    snapshots: snapshots ?? [],
  }
}

export async function createProjectMarginSnapshot(projectId: string) {
  const { supabase, user, role } = await requireUser()
  if (!user) return { error: 'Nao autenticado' }
  if (role !== 'admin') return { error: 'Acesso negado' }

  const marginData = await getProjectMarginData(projectId)
  if (marginData.error || !marginData.summary) return { error: marginData.error ?? 'Sem dados' }

  const { error } = await supabase
    .from('project_cost_snapshots')
    .insert({
      project_id: projectId,
      logged_hours: marginData.summary.loggedHours,
      internal_cost: marginData.summary.internalCost,
      recognized_revenue: marginData.summary.recognizedRevenue,
      gross_margin: marginData.summary.grossMargin,
      snapshot_date: new Date().toISOString().slice(0, 10),
    })

  if (error) return { error: error.message }

  revalidatePath(`/projects/${projectId}/finance`)
  revalidatePath(`/projects/${projectId}/productivity`)
  return { success: true }
}

type ProfitabilityProject = {
  projectId: string
  projectName: string
  clientName: string | null
  contractValue: number
  targetMargin: number | null
  loggedHours: number
  internalCost: number
  recognizedRevenue: number
  grossMargin: number
  marginPercent: number | null
  marginGapToTarget: number | null
  marginRisk: 'no_revenue' | 'healthy' | 'warning' | 'critical'
}

export async function getPortfolioProfitabilityData(days = 90) {
  return getPortfolioProfitabilityDataFiltered(days, {})
}

type PortfolioFilters = {
  client?: string | null
  projectType?: string | null
}

export async function getPortfolioProfitabilityDataFiltered(days = 90, filters: PortfolioFilters = {}) {
  const { supabase, user, role } = await requireUser()
  if (!user) return { error: 'Nao autenticado', data: [] as ProfitabilityProject[] }
  if (role !== 'admin') return { error: 'Acesso negado', data: [] as ProfitabilityProject[] }
  const since = dateNDaysAgoISO(Math.max(1, Math.min(180, Math.floor(days))))

  const projectQuery = supabase
    .from('projects')
    .select('id, name, type, contract_value, margin_percent, clients(name)')
    .neq('status', 'cancelled')

  if (filters.projectType) {
    projectQuery.eq('type', filters.projectType)
  }
  if (filters.client) {
    projectQuery.eq('clients.name', filters.client)
  }

  const [{ data: projectsRes }, { data: timeEntriesRes }, { data: invoicesRes }] = await Promise.all([
    projectQuery,
    supabase
      .from('time_entries')
      .select('project_id, hours, user:profiles!time_entries_user_id_fkey(hour_cost)')
      .not('project_id', 'is', null)
      .gte('entry_date', since),
    supabase
      .from('invoices')
      .select('project_id, amount, status, issue_date')
      .in('status', ['issued', 'paid']),
  ])

  const projects = projectsRes ?? []
  const timeEntries = timeEntriesRes ?? []
  const invoices = invoicesRes ?? []

  const hoursByProject = new Map<string, number>()
  const costByProject = new Map<string, number>()
  const revenueByProject = new Map<string, number>()

  for (const entry of timeEntries) {
    if (!entry.project_id) continue
    const hours = Number(entry.hours ?? 0)
    const userData = Array.isArray(entry.user) ? entry.user[0] : entry.user
    const hourCost = Number(userData?.hour_cost ?? 0)

    hoursByProject.set(entry.project_id, (hoursByProject.get(entry.project_id) ?? 0) + hours)
    costByProject.set(entry.project_id, (costByProject.get(entry.project_id) ?? 0) + hours * hourCost)
  }

  for (const invoice of invoices) {
    if (!invoice.project_id) continue
    if (invoice.issue_date && invoice.issue_date < since) continue
    const amount = Number(invoice.amount ?? 0)
    revenueByProject.set(invoice.project_id, (revenueByProject.get(invoice.project_id) ?? 0) + amount)
  }

  const data: ProfitabilityProject[] = projects.map((project) => {
    const projectId = project.id
    const internalCost = costByProject.get(projectId) ?? 0
    const recognizedRevenue = revenueByProject.get(projectId) ?? 0
    const grossMargin = recognizedRevenue - internalCost
    const marginPercent = recognizedRevenue > 0 ? (grossMargin / recognizedRevenue) * 100 : null
    const targetMargin = project.margin_percent ?? null
    const marginGapToTarget =
      targetMargin != null && marginPercent != null ? marginPercent - targetMargin : null
    const marginRisk: ProfitabilityProject['marginRisk'] =
      marginPercent == null
        ? 'no_revenue'
        : marginPercent < 10 || (marginGapToTarget != null && marginGapToTarget <= -10)
          ? 'critical'
          : marginPercent < 25 || (marginGapToTarget != null && marginGapToTarget < 0)
            ? 'warning'
            : 'healthy'
    const clientData = Array.isArray(project.clients) ? project.clients[0] : project.clients

    return {
      projectId,
      projectName: project.name,
      clientName: clientData?.name ?? null,
      contractValue: Number(project.contract_value ?? 0),
      targetMargin,
      loggedHours: hoursByProject.get(projectId) ?? 0,
      internalCost,
      recognizedRevenue,
      grossMargin,
      marginPercent,
      marginGapToTarget,
      marginRisk,
    }
  })

  return {
    error: null,
    data: data.sort((a, b) => b.grossMargin - a.grossMargin),
  }
}

type IndividualPerformance = {
  userId: string
  fullName: string
  loggedHours: number
  approvedHours: number
  completionRate: number
  completedTasks: number
  overdueOpenTasks: number
  internalCost: number
  billableEstimate: number
  grossContribution: number
  efficiencyScore: number
}

function dateNDaysAgoISO(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

export async function getIndividualPerformanceData(days = 30) {
  return getIndividualPerformanceDataFiltered(days, {})
}

export async function getIndividualPerformanceDataFiltered(
  days = 30,
  filters: PortfolioFilters = {},
) {
  const { supabase, user, role } = await requireUser()
  if (!user) return { error: 'Nao autenticado', data: [] as IndividualPerformance[] }
  if (role !== 'admin') return { error: 'Acesso negado', data: [] as IndividualPerformance[] }

  const since = dateNDaysAgoISO(Math.max(1, Math.min(90, Math.floor(days))))
  const todayISO = new Date().toISOString().slice(0, 10)

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!membership?.workspace_id) {
    return { error: 'Workspace nao encontrado', data: [] as IndividualPerformance[] }
  }

  const workspaceId = membership.workspace_id

  const projectQuery = supabase.from('projects').select('id, type, clients(name)').eq('workspace_id', workspaceId)
  if (filters.projectType) {
    projectQuery.eq('type', filters.projectType)
  }
  if (filters.client) {
    projectQuery.eq('clients.name', filters.client)
  }

  const [{ data: membersRes }, { data: projectsRes }] = await Promise.all([
    supabase
      .from('workspace_members')
      .select('user_id, profiles!workspace_members_user_id_fkey(id, full_name, role, hour_cost, bill_rate)')
      .eq('workspace_id', workspaceId),
    projectQuery,
  ])

  const members = (membersRes ?? [])
    .map((item) => ({
      user_id: item.user_id,
      profile: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles,
    }))
    .filter((item) => item.profile?.role === 'admin')
    .map((item) => ({
      id: item.user_id,
      fullName: item.profile?.full_name ?? 'Sem nome',
      hourCost: Number(item.profile?.hour_cost ?? 0),
      billRate: Number(item.profile?.bill_rate ?? 0),
    }))

  const projectIds = (projectsRes ?? []).map((project) => project.id)
  if (projectIds.length === 0 || members.length === 0) {
    return { error: null, data: [] as IndividualPerformance[] }
  }

  const memberIds = members.map((member) => member.id)

  const [{ data: entriesRes }, { data: tasksRes }] = await Promise.all([
    supabase
      .from('time_entries')
      .select('user_id, hours, approved_at, entry_date')
      .in('project_id', projectIds)
      .in('user_id', memberIds)
      .gte('entry_date', since),
    supabase
      .from('tasks')
      .select('assignee_id, status, due_date, updated_at')
      .in('project_id', projectIds)
      .in('assignee_id', memberIds),
  ])

  const entries = entriesRes ?? []
  const tasks = tasksRes ?? []

  const result: IndividualPerformance[] = members.map((member) => {
    const personEntries = entries.filter((entry) => entry.user_id === member.id)
    const personTasks = tasks.filter((task) => task.assignee_id === member.id)

    const loggedHours = personEntries.reduce((sum, entry) => sum + Number(entry.hours ?? 0), 0)
    const approvedHours = personEntries.reduce(
      (sum, entry) => sum + (entry.approved_at ? Number(entry.hours ?? 0) : 0),
      0,
    )

    const completedTasks = personTasks.filter((task) => task.status === 'done').length
    const overdueOpenTasks = personTasks.filter(
      (task) => task.status !== 'done' && task.due_date && task.due_date < todayISO,
    ).length

    const completionRate = loggedHours > 0 ? (approvedHours / loggedHours) * 100 : 0
    const internalCost = loggedHours * member.hourCost
    const billableEstimate = loggedHours * member.billRate
    const grossContribution = billableEstimate - internalCost

    const tasksPer10Hours = loggedHours > 0 ? (completedTasks / loggedHours) * 10 : 0
    const scoreBase = Math.min(tasksPer10Hours * 35, 50) + Math.min(completionRate * 0.45, 45)
    const penalty = Math.min(overdueOpenTasks * 8, 30)
    const efficiencyScore = Math.max(0, Math.min(100, scoreBase - penalty))

    return {
      userId: member.id,
      fullName: member.fullName,
      loggedHours,
      approvedHours,
      completionRate,
      completedTasks,
      overdueOpenTasks,
      internalCost,
      billableEstimate,
      grossContribution,
      efficiencyScore,
    }
  })

  return {
    error: null,
    data: result.sort((a, b) => b.efficiencyScore - a.efficiencyScore),
  }
}
