'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { timeEntrySchema, type TimeEntryInput } from '@/lib/validations'

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

async function recalculateTaskHours(supabase: Awaited<ReturnType<typeof createClient>>, taskId: string) {
  const { data: entries } = await supabase
    .from('time_entries')
    .select('hours')
    .eq('task_id', taskId)

  const total = (entries ?? []).reduce((sum, entry) => sum + Number(entry.hours ?? 0), 0)
  await supabase
    .from('tasks')
    .update({ actual_hours: total, updated_at: new Date().toISOString() })
    .eq('id', taskId)
}

export async function getProjectTimeEntries(projectId: string) {
  const { supabase, user, role } = await requireUser()
  if (!user) return { error: 'Nao autenticado', data: [] }

  let query = supabase
    .from('time_entries')
    .select('*, task:tasks(id, title), user:profiles!time_entries_user_id_fkey(id, full_name)')
    .eq('project_id', projectId)
    .order('entry_date', { ascending: false })

  if (role !== 'admin') {
    query = query.eq('user_id', user.id)
  }

  const { data, error } = await query
  if (error) return { error: error.message, data: [] }
  return { error: null, data: data ?? [] }
}

export async function createTimeEntry(projectId: string, data: TimeEntryInput) {
  const { supabase, user } = await requireUser()
  if (!user) return { error: 'Nao autenticado' }

  const parsed = timeEntrySchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados invalidos' }

  const { error } = await supabase
    .from('time_entries')
    .insert({
      project_id: projectId,
      user_id: user.id,
      ...parsed.data,
    })

  if (error) return { error: error.message }

  if (parsed.data.task_id) {
    await recalculateTaskHours(supabase, parsed.data.task_id)
  }

  revalidatePath(`/projects/${projectId}/hours`)
  revalidatePath(`/projects/${projectId}/tasks`)
  revalidatePath(`/projects/${projectId}/productivity`)
  return { success: true }
}

export async function approveTimeEntry(projectId: string, timeEntryId: string) {
  const { supabase, user, role } = await requireUser()
  if (!user) return { error: 'Nao autenticado' }
  if (role !== 'admin') return { error: 'Acesso negado' }

  const { error } = await supabase
    .from('time_entries')
    .update({
      approved_at: new Date().toISOString(),
      approved_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', timeEntryId)
    .eq('project_id', projectId)

  if (error) return { error: error.message }

  revalidatePath(`/projects/${projectId}/hours`)
  return { success: true }
}

function calculateHoursFromInterval(startedAt: string, endedAt: string) {
  const started = new Date(startedAt).getTime()
  const ended = new Date(endedAt).getTime()
  if (!Number.isFinite(started) || !Number.isFinite(ended) || ended <= started) {
    return 0.01
  }
  const rawHours = (ended - started) / (1000 * 60 * 60)
  return Math.max(0.01, Number(rawHours.toFixed(2)))
}

export async function getActiveTaskTimer(projectId: string) {
  const { supabase, user } = await requireUser()
  if (!user) return { error: 'Nao autenticado', timer: null }

  const { data, error } = await supabase
    .from('time_entries')
    .select('id, project_id, task_id, started_at, is_running')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .eq('is_running', true)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return { error: error.message, timer: null }
  return { error: null, timer: data }
}

export async function startTaskTimer(projectId: string, taskId: string, notes?: string) {
  const { supabase, user } = await requireUser()
  if (!user) return { error: 'Nao autenticado' }

  const { data: activeTimer } = await supabase
    .from('time_entries')
    .select('id, task_id')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .eq('is_running', true)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (activeTimer) {
    if (activeTimer.task_id === taskId) {
      return { success: true, alreadyRunning: true, timerId: activeTimer.id }
    }
    return { error: 'Voce ja possui um timer ativo em outra tarefa. Pare o timer atual para iniciar um novo.' }
  }

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('time_entries')
    .insert({
      project_id: projectId,
      task_id: taskId,
      user_id: user.id,
      entry_date: now.slice(0, 10),
      started_at: now,
      is_running: true,
      hours: null,
      notes: notes ?? null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/projects/${projectId}/hours`)
  revalidatePath(`/projects/${projectId}/tasks`)
  return { success: true, timerId: data.id }
}

export async function stopTaskTimer(projectId: string, taskId?: string) {
  const { supabase, user } = await requireUser()
  if (!user) return { error: 'Nao autenticado' }

  let query = supabase
    .from('time_entries')
    .select('id, task_id, started_at')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .eq('is_running', true)
    .order('started_at', { ascending: false })
    .limit(1)

  if (taskId) {
    query = query.eq('task_id', taskId)
  }

  const { data: running, error: runningError } = await query.maybeSingle()
  if (runningError) return { error: runningError.message }
  if (!running) return { error: 'Nenhum timer ativo encontrado para esta tarefa.' }
  if (!running.started_at) return { error: 'Timer ativo sem started_at. Verifique os dados.' }

  const endedAt = new Date().toISOString()
  const hours = calculateHoursFromInterval(running.started_at, endedAt)

  const { error } = await supabase
    .from('time_entries')
    .update({
      ended_at: endedAt,
      is_running: false,
      hours,
      updated_at: endedAt,
    })
    .eq('id', running.id)

  if (error) return { error: error.message }

  if (running.task_id) {
    await recalculateTaskHours(supabase, running.task_id)
  }

  revalidatePath(`/projects/${projectId}/hours`)
  revalidatePath(`/projects/${projectId}/tasks`)
  revalidatePath(`/projects/${projectId}/productivity`)
  return { success: true, hours, timeEntryId: running.id }
}
