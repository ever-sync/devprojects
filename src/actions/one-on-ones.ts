'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' as const }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const { data: membership } = await supabase.from('workspace_members').select('workspace_id').eq('user_id', user.id).limit(1).single()
  if (!membership?.workspace_id) return { error: 'Workspace não encontrado' as const }
  return { supabase, user, profile, workspaceId: membership.workspace_id as string }
}

export async function getOneOnOnes() {
  const ctx = await requireAuth()
  if ('error' in ctx) return { error: ctx.error, items: [] }
  const isAdmin = ctx.profile?.role === 'admin'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (ctx.supabase as any)
    .from('one_on_ones')
    .select('*, manager:profiles!one_on_ones_manager_id_fkey(id, full_name, avatar_url), report:profiles!one_on_ones_report_id_fkey(id, full_name, avatar_url)')
    .eq('workspace_id', ctx.workspaceId)
    .order('scheduled_at', { ascending: false })

  if (!isAdmin) {
    query = query.or(`manager_id.eq.${ctx.user.id},report_id.eq.${ctx.user.id}`)
  }

  const { data, error } = await query
  return { error: error?.message ?? null, items: (data ?? []) as OneOnOne[] }
}

export async function getTeamMembers() {
  const ctx = await requireAuth()
  if ('error' in ctx) return { error: ctx.error, members: [] }
  const { data, error } = await ctx.supabase
    .from('workspace_members')
    .select('user_id, profiles!workspace_members_user_id_fkey(id, full_name, avatar_url)')
    .eq('workspace_id', ctx.workspaceId)
  if (error) return { error: error.message, members: [] }
  return {
    error: null,
    members: (data ?? []).map((m) => (m as { profiles: { id: string; full_name: string; avatar_url: string | null } }).profiles).filter(Boolean),
  }
}

export async function createOneOnOne(input: {
  reportId: string
  scheduledAt?: string
  notes?: string
}) {
  const ctx = await requireAuth()
  if ('error' in ctx) return { error: ctx.error }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (ctx.supabase as any).from('one_on_ones').insert({
    workspace_id: ctx.workspaceId,
    manager_id: ctx.user.id,
    report_id: input.reportId,
    scheduled_at: input.scheduledAt ?? null,
    notes: input.notes ?? null,
    action_items: [],
  })
  if (error) return { error: error.message }
  revalidatePath('/team/one-on-ones')
  return { error: null }
}

export async function updateOneOnOne(id: string, input: {
  notes?: string
  actionItems?: Array<{ id: string; text: string; done: boolean; assignee?: string }>
  status?: 'scheduled' | 'completed' | 'cancelled'
  scheduledAt?: string
}) {
  const ctx = await requireAuth()
  if ('error' in ctx) return { error: ctx.error }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (ctx.supabase as any)
    .from('one_on_ones')
    .update({
      notes: input.notes,
      action_items: input.actionItems,
      status: input.status,
      scheduled_at: input.scheduledAt,
    })
    .eq('id', id)
    .or(`manager_id.eq.${ctx.user.id},report_id.eq.${ctx.user.id}`)
  if (error) return { error: error.message }
  revalidatePath('/team/one-on-ones')
  return { error: null }
}

export interface OneOnOne {
  id: string
  workspace_id: string
  manager_id: string
  report_id: string
  scheduled_at: string | null
  notes: string | null
  action_items: Array<{ id: string; text: string; done: boolean; assignee?: string }>
  status: 'scheduled' | 'completed' | 'cancelled'
  created_at: string
  manager: { id: string; full_name: string; avatar_url: string | null }
  report: { id: string; full_name: string; avatar_url: string | null }
}
