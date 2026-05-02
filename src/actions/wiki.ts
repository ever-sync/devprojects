'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'

async function requireAdminWithWorkspace() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' as const }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') return { error: 'Acesso negado' as const }
  const { data: membership } = await supabase.from('workspace_members').select('workspace_id').eq('user_id', user.id).limit(1).single()
  if (!membership?.workspace_id) return { error: 'Workspace não encontrado' as const }
  return { supabase, user, workspaceId: membership.workspace_id as string }
}

async function requireMemberWithWorkspace() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' as const }
  const { data: membership } = await supabase.from('workspace_members').select('workspace_id').eq('user_id', user.id).limit(1).single()
  if (!membership?.workspace_id) return { error: 'Workspace não encontrado' as const }
  return { supabase, user, workspaceId: membership.workspace_id as string }
}

export async function getWikiPages() {
  const ctx = await requireMemberWithWorkspace()
  if ('error' in ctx) return { error: ctx.error, pages: [] }
  const { data, error } = await ctx.supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from('wiki_pages' as any)
    .select('id, slug, title, icon, parent_id, updated_at')
    .eq('workspace_id', ctx.workspaceId)
    .order('title')
  return { error: error?.message ?? null, pages: (data ?? []) as WikiPageMeta[] }
}

export async function getWikiPage(slug: string) {
  const ctx = await requireMemberWithWorkspace()
  if ('error' in ctx) return { error: ctx.error, page: null }
  const { data, error } = await ctx.supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from('wiki_pages' as any)
    .select('*, author:profiles!wiki_pages_created_by_fkey(full_name), updater:profiles!wiki_pages_updated_by_fkey(full_name)')
    .eq('workspace_id', ctx.workspaceId)
    .eq('slug', slug)
    .single()
  if (error) return { error: error.message, page: null }
  return { error: null, page: data as WikiPage }
}

export async function upsertWikiPage(input: { slug: string; title: string; content: string; icon?: string; parentId?: string | null }) {
  const ctx = await requireAdminWithWorkspace()
  if ('error' in ctx) return { error: ctx.error }

  const payload = {
    workspace_id: ctx.workspaceId,
    slug: input.slug,
    title: input.title,
    content: input.content,
    icon: input.icon ?? null,
    parent_id: input.parentId ?? null,
    updated_by: ctx.user.id,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await ctx.supabase.from('wiki_pages' as any).upsert(
    { ...payload, created_by: ctx.user.id },
    { onConflict: 'workspace_id,slug', ignoreDuplicates: false }
  )
  if (error) return { error: error.message }
  revalidatePath('/wiki')
  return { error: null }
}

export async function deleteWikiPage(id: string) {
  const ctx = await requireAdminWithWorkspace()
  if ('error' in ctx) return { error: ctx.error }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await ctx.supabase.from('wiki_pages' as any).delete().eq('id', id).eq('workspace_id', ctx.workspaceId)
  if (error) return { error: error.message }
  revalidatePath('/wiki')
  return { error: null }
}

export interface WikiPageMeta {
  id: string
  slug: string
  title: string
  icon: string | null
  parent_id: string | null
  updated_at: string
}

export interface WikiPage extends WikiPageMeta {
  content: string
  created_by: string | null
  updated_by: string | null
  author: { full_name: string } | null
  updater: { full_name: string } | null
  created_at: string
}
