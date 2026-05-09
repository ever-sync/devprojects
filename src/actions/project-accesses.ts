'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, role: null }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return { supabase, user, role: profile?.role ?? null }
}

export type ProjectAccessType = 'credential' | 'api_key'

export interface ProjectAccessData {
  type: ProjectAccessType
  name: string
  login?: string
  password?: string
  api_key?: string
  url?: string
  notes?: string
}

export async function listProjectAccesses(projectId: string) {
  const { supabase, user } = await requireAuth()
  if (!user) return { data: null, error: 'Nao autenticado' }

  const { data, error } = await supabase
    .from('project_accesses')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  return { data, error: error?.message ?? null }
}

export async function createProjectAccess(projectId: string, input: ProjectAccessData) {
  const { supabase, user, role } = await requireAuth()
  if (!user) return { error: 'Nao autenticado' }
  if (role !== 'admin') return { error: 'Acesso negado' }

  const { error } = await supabase.from('project_accesses').insert({
    project_id: projectId,
    type: input.type,
    name: input.name,
    login: input.login || null,
    password: input.password || null,
    api_key: input.api_key || null,
    url: input.url || null,
    notes: input.notes || null,
    created_by: user.id,
  })

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/acessos`)
  return { error: null }
}

export async function updateProjectAccess(id: string, projectId: string, input: ProjectAccessData) {
  const { supabase, user, role } = await requireAuth()
  if (!user) return { error: 'Nao autenticado' }
  if (role !== 'admin') return { error: 'Acesso negado' }

  const { error } = await supabase.from('project_accesses').update({
    type: input.type,
    name: input.name,
    login: input.login || null,
    password: input.password || null,
    api_key: input.api_key || null,
    url: input.url || null,
    notes: input.notes || null,
  }).eq('id', id).eq('project_id', projectId)

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/acessos`)
  return { error: null }
}

export async function deleteProjectAccess(id: string, projectId: string) {
  const { supabase, user, role } = await requireAuth()
  if (!user) return { error: 'Nao autenticado' }
  if (role !== 'admin') return { error: 'Acesso negado' }

  const { error } = await supabase.from('project_accesses').delete().eq('id', id).eq('project_id', projectId)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/acessos`)
  return { error: null }
}
