'use server'

import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { ProjectActivity, Profile } from '@/types'

export type ActivityWithUser = ProjectActivity & {
  user: Pick<Profile, 'full_name' | 'avatar_url' | 'role'>
}

export async function getProjectActivities(projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [], error: 'Não autenticado' }

  const { data, error } = await supabase
    .from('project_activities')
    .select(`
      *,
      user:profiles!project_activities_user_id_fkey(full_name, avatar_url, role)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return { data: [], error: error.message }

  return { data: (data as unknown as ActivityWithUser[]) ?? [], error: null }
}

export async function getPublicProjectActivities(token: string) {
  const adminClient = createAdminClient()

  const { data: project, error: projectError } = await adminClient
    .from('projects')
    .select('id')
    .eq('public_token', token)
    .eq('public_enabled', true)
    .single()

  if (projectError || !project) {
    return { data: [], error: 'Projeto n\u00e3o encontrado' }
  }

  const { data, error } = await adminClient
    .from('project_activities')
    .select(`
      *,
      user:profiles!project_activities_user_id_fkey(full_name, avatar_url, role)
    `)
    .eq('project_id', project.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return { data: [], error: error.message }

  return { data: (data as unknown as ActivityWithUser[]) ?? [], error: null }
}
