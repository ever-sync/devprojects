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
