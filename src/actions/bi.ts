'use server'

import { createClient } from '@/lib/supabase/server'
import { startOfMonth, subMonths, format } from 'date-fns'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' as const }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Acesso negado' as const }
  return { supabase, user }
}

type ProjectRow = { id: string; name: string; type: string; status: string; health_status: string | null; created_at: string; client: { name: string } | null }
type MilestoneRow = { id: string; amount: number; status: string; due_date: string | null; paid_at: string | null; project_id: string }

export async function getBIDashboard(months = 6) {
  const ctx = await requireAdmin()
  if ('error' in ctx) return { error: ctx.error, data: null }

  const sinceDate = format(startOfMonth(subMonths(new Date(), months - 1)), 'yyyy-MM-dd')

  const [projectsRes, milestonesRes, timeRes, tasksRes, teamRes] = await Promise.all([
    (ctx.supabase as any)
      .from('projects')
      .select('id, name, type, status, health_status, created_at, client:clients(name)')
      .gte('created_at', sinceDate),
    (ctx.supabase as any)
      .from('billing_milestones')
      .select('id, amount, status, due_date, paid_at, project_id')
      .gte('created_at', sinceDate),
    ctx.supabase
      .from('time_entries')
      .select('id, hours, entry_date, user_id, project_id, is_running')
      .gte('entry_date', sinceDate)
      .eq('is_running', false),
    ctx.supabase
      .from('tasks')
      .select('id, status, due_date, created_at, project_id, assignee_id')
      .gte('created_at', sinceDate),
    ctx.supabase
      .from('profiles')
      .select('id, full_name, role, hour_cost, bill_rate')
      .eq('role', 'admin'),
  ])

  const projects = (projectsRes.data ?? []) as ProjectRow[]
  const milestones = (milestonesRes.data ?? []) as MilestoneRow[]
  const timeEntries = timeRes.data ?? []
  const tasks = tasksRes.data ?? []
  const team = teamRes.data ?? []

  // ── Revenue por mês ──────────────────────────────────────────
  const revenueByMonth: Record<string, { invoiced: number; paid: number }> = {}
  for (const m of milestones) {
    const month = (m.due_date ?? m.paid_at ?? '').slice(0, 7)
    if (!month) continue
    if (!revenueByMonth[month]) revenueByMonth[month] = { invoiced: 0, paid: 0 }
    if (['invoiced', 'paid'].includes(m.status)) revenueByMonth[month].invoiced += m.amount
    if (m.status === 'paid') revenueByMonth[month].paid += m.amount
  }

  // ── Horas por projeto ─────────────────────────────────────────
  const hoursByProject: Record<string, number> = {}
  for (const e of timeEntries) {
    hoursByProject[e.project_id] = (hoursByProject[e.project_id] ?? 0) + (e.hours ?? 0)
  }

  // ── Horas por pessoa ──────────────────────────────────────────
  const hoursByPerson: Record<string, number> = {}
  for (const e of timeEntries) {
    hoursByPerson[e.user_id] = (hoursByPerson[e.user_id] ?? 0) + (e.hours ?? 0)
  }

  // ── Tasks concluídas por semana ───────────────────────────────
  const tasksByWeek: Record<string, { done: number; total: number }> = {}
  for (const t of tasks) {
    const week = t.created_at.slice(0, 10)
    if (!tasksByWeek[week]) tasksByWeek[week] = { done: 0, total: 0 }
    tasksByWeek[week].total++
    if (t.status === 'done') tasksByWeek[week].done++
  }

  // ── KPIs gerais ───────────────────────────────────────────────
  const totalInvoiced = milestones.filter((m) => ['invoiced', 'paid'].includes(m.status)).reduce((s, m) => s + m.amount, 0)
  const totalPaid = milestones.filter((m) => m.status === 'paid').reduce((s, m) => s + m.amount, 0)
  const totalHours = timeEntries.reduce((s, e) => s + (e.hours ?? 0), 0)
  const activeProjects = projects.filter((p) => p.status === 'active').length
  const tasksCompleted = tasks.filter((t) => t.status === 'done').length
  const tasksOverdue = tasks.filter((t) => t.due_date && t.due_date < new Date().toISOString().slice(0, 10) && t.status !== 'done').length

  // ── Lucratividade estimada ────────────────────────────────────
  const avgHourCost = team.reduce((s, p) => s + (p.hour_cost ?? 0), 0) / (team.length || 1)
  const totalCost = totalHours * avgHourCost
  const grossMargin = totalPaid > 0 ? Math.round(((totalPaid - totalCost) / totalPaid) * 100) : null

  // ── Top projetos por horas ────────────────────────────────────
  const topProjectsByHours = projects
    .map((p) => ({ id: p.id, name: p.name, hours: hoursByProject[p.id] ?? 0, type: p.type }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 8)

  // ── Performance da equipe ─────────────────────────────────────
  const teamPerformance = team.map((p) => ({
    id: p.id,
    name: p.full_name,
    hours: hoursByPerson[p.id] ?? 0,
    revenue: (hoursByPerson[p.id] ?? 0) * (p.bill_rate ?? 0),
    cost: (hoursByPerson[p.id] ?? 0) * (p.hour_cost ?? 0),
  })).sort((a, b) => b.hours - a.hours)

  // ── Revenue chart data ────────────────────────────────────────
  const revenueChart = Object.entries(revenueByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v }))

  return {
    error: null,
    data: {
      kpis: { totalInvoiced, totalPaid, totalHours, activeProjects, tasksCompleted, tasksOverdue, grossMargin },
      revenueChart,
      topProjectsByHours,
      teamPerformance,
      projectsByStatus: {
        active: projects.filter((p) => p.status === 'active').length,
        completed: projects.filter((p) => p.status === 'completed').length,
        paused: projects.filter((p) => p.status === 'paused').length,
      },
      projectsByHealth: {
        green: projects.filter((p) => p.health_status === 'green').length,
        yellow: projects.filter((p) => p.health_status === 'yellow').length,
        red: projects.filter((p) => p.health_status === 'red').length,
      },
    },
  }
}

export type BIData = NonNullable<Awaited<ReturnType<typeof getBIDashboard>>['data']>
