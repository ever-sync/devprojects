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

export async function getOKRs(period?: string) {
  const ctx = await requireAuth()
  if ('error' in ctx) return { error: ctx.error, okrs: [] }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (ctx.supabase as any)
    .from('okrs')
    .select('*, owner:profiles!okrs_owner_id_fkey(id, full_name, avatar_url), key_results:okr_key_results(*)')
    .eq('workspace_id', ctx.workspaceId)
    .order('created_at', { ascending: false })
  if (period) query = query.eq('period', period)
  const { data, error } = await query
  return { error: error?.message ?? null, okrs: (data ?? []) as OKR[] }
}

export async function createOKR(input: { title: string; description?: string; period: string; ownerId?: string }) {
  const ctx = await requireAuth()
  if ('error' in ctx) return { error: ctx.error }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (ctx.supabase as any).from('okrs').insert({
    workspace_id: ctx.workspaceId,
    title: input.title,
    description: input.description ?? null,
    period: input.period,
    owner_id: input.ownerId ?? ctx.user.id,
  })
  if (error) return { error: error.message }
  revalidatePath('/okrs')
  return { error: null }
}

export async function updateOKRStatus(id: string, status: OKR['status']) {
  const ctx = await requireAuth()
  if ('error' in ctx) return { error: ctx.error }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (ctx.supabase as any).from('okrs').update({ status }).eq('id', id).eq('workspace_id', ctx.workspaceId)
  if (error) return { error: error.message }
  revalidatePath('/okrs')
  return { error: null }
}

export async function upsertKeyResult(input: { id?: string; okrId: string; title: string; target: number; current: number; unit: string }) {
  const ctx = await requireAuth()
  if ('error' in ctx) return { error: ctx.error }
  const payload = { okr_id: input.okrId, title: input.title, target: input.target, current: input.current, unit: input.unit }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = input.id
    ? await (ctx.supabase as any).from('okr_key_results').update(payload).eq('id', input.id)
    : await (ctx.supabase as any).from('okr_key_results').insert(payload)
  if (error) return { error: error.message }
  revalidatePath('/okrs')
  return { error: null }
}

export async function deleteKeyResult(id: string) {
  const ctx = await requireAuth()
  if ('error' in ctx) return { error: ctx.error }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (ctx.supabase as any).from('okr_key_results').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/okrs')
  return { error: null }
}

export async function getDistinctPeriods() {
  const ctx = await requireAuth()
  if ('error' in ctx) return { periods: [] }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (ctx.supabase as any).from('okrs').select('period').eq('workspace_id', ctx.workspaceId).order('period', { ascending: false })
  return { periods: [...new Set((data ?? []).map((r: { period: string }) => r.period))] as string[] }
}

export interface KeyResult {
  id: string
  okr_id: string
  title: string
  target: number
  current: number
  unit: string
  created_at: string
}

export interface OKR {
  id: string
  workspace_id: string
  owner_id: string | null
  title: string
  description: string | null
  period: string
  status: 'draft' | 'active' | 'completed' | 'cancelled'
  created_at: string
  owner: { id: string; full_name: string; avatar_url: string | null } | null
  key_results: KeyResult[]
}
