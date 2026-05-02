'use server'

import { createClient } from '@/lib/supabase/server'

type SlackChannel = { id: string; name: string }

async function requireAdminWithWorkspace() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nao autenticado' as const }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') return { error: 'Acesso negado' as const }

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .in('role', ['owner', 'admin'])
    .limit(1)
    .single()

  if (!membership?.workspace_id) return { error: 'Workspace nao encontrado' as const }

  return { supabase, user, workspaceId: membership.workspace_id as string }
}

export async function getSlackIntegrationStatus() {
  const guard = await requireAdminWithWorkspace()
  if ('error' in guard) return { error: guard.error, connected: false }

  const { supabase, workspaceId } = guard
  const { data } = await supabase
    .from('external_integrations')
    .select('id, credentials, is_active, updated_at')
    .eq('workspace_id', workspaceId)
    .eq('service_type', 'slack')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return { connected: false, integration: null, workspaceId }
  return { connected: true, integration: data, workspaceId }
}

export async function listSlackChannels() {
  const guard = await requireAdminWithWorkspace()
  if ('error' in guard) return { error: guard.error, channels: [] as SlackChannel[] }

  const { supabase, workspaceId } = guard
  const { data: integration } = await supabase
    .from('external_integrations')
    .select('credentials')
    .eq('workspace_id', workspaceId)
    .eq('service_type', 'slack')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  const token = (integration?.credentials as { bot_token?: string } | null)?.bot_token
  if (!token) return { error: 'Slack nao conectado', channels: [] as SlackChannel[] }

  const response = await fetch('https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=200', {
    headers: { Authorization: `Bearer ${token}` },
  })
  const payload = (await response.json()) as { ok?: boolean; error?: string; channels?: Array<{ id: string; name: string }> }
  if (!payload.ok) return { error: payload.error ?? 'Erro ao listar canais', channels: [] as SlackChannel[] }

  return { error: null, channels: (payload.channels ?? []).map((c) => ({ id: c.id, name: c.name })) }
}

export async function setSlackDefaultChannel(channelId: string, channelName: string) {
  const guard = await requireAdminWithWorkspace()
  if ('error' in guard) return { error: guard.error }

  const { supabase, workspaceId } = guard
  const { data: integration } = await supabase
    .from('external_integrations')
    .select('id, credentials')
    .eq('workspace_id', workspaceId)
    .eq('service_type', 'slack')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (!integration) return { error: 'Slack nao conectado' }

  const credentials = (integration.credentials as Record<string, unknown> | null) ?? {}
  credentials.channel_id = channelId
  credentials.channel_name = channelName

  const { error } = await supabase
    .from('external_integrations')
    .update({ credentials, updated_at: new Date().toISOString() })
    .eq('id', integration.id)

  if (error) return { error: error.message }
  return { success: true }
}
