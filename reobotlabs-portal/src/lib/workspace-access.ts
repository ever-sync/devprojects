'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database.types'

type AppSupabaseClient = SupabaseClient<Database>

export async function getClientWorkspaceId(supabase: AppSupabaseClient, clientId: string) {
  const { data, error } = await supabase
    .from('clients')
    .select('workspace_id')
    .eq('id', clientId)
    .single()

  if (error) return { workspaceId: null, error }
  return { workspaceId: data.workspace_id, error: null }
}

export async function getProjectWorkspaceId(supabase: AppSupabaseClient, projectId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('workspace_id')
    .eq('id', projectId)
    .single()

  if (error) return { workspaceId: null, error }
  return { workspaceId: data.workspace_id, error: null }
}

export async function userHasWorkspaceMembership(
  supabase: AppSupabaseClient,
  workspaceId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle()

  return { hasMembership: Boolean(data), error }
}

export async function getUserAccessibleClients(supabase: AppSupabaseClient) {
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, notification_settings, workspace_id')
    .order('name')

  if (error) return { clients: [], error }
  return { clients: data, error: null }
}

export async function createAuditLog(
  supabase: AppSupabaseClient,
  input: {
    workspaceId?: string | null
    actorUserId?: string | null
    entityType: string
    entityId?: string | null
    action: string
    metadata?: Record<string, unknown>
  },
) {
  return supabase.from('audit_logs').insert({
    workspace_id: input.workspaceId ?? null,
    actor_user_id: input.actorUserId ?? null,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    action: input.action,
    metadata: (input.metadata ?? {}) as Json,
  })
}
