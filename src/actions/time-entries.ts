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
