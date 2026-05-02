'use server'

import { createClient } from '@/lib/supabase/server'
import { sendDiscordNotification } from '@/lib/discord'

type DiscordCredentials = {
  webhook_url?: string
  channel_name?: string
}

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

export async function getDiscordIntegrationStatus() {
  const guard = await requireAdminWithWorkspace()
  if ('error' in guard) return { error: guard.error, connected: false }

  const { supabase, workspaceId } = guard
  const { data } = await supabase
    .from('external_integrations')
    .select('id, credentials, is_active, updated_at')
    .eq('workspace_id', workspaceId)
    .eq('service_type', 'discord')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return { connected: false, integration: null, workspaceId }
  return { connected: true, integration: data, workspaceId }
}

export async function saveDiscordWebhook(webhookUrl: string, channelName?: string) {
  const guard = await requireAdminWithWorkspace()
  if ('error' in guard) return { error: guard.error }
  const { supabase, workspaceId } = guard

  const normalized = webhookUrl.trim()
  if (!normalized) return { error: 'Informe a webhook URL do Discord' }
  if (!/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/.+/i.test(normalized)) {
    return { error: 'Webhook URL do Discord invalida' }
  }

  const credentials: DiscordCredentials = {
    webhook_url: normalized,
    channel_name: channelName?.trim() || undefined,
  }

  const { data: existing } = await supabase
    .from('external_integrations')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('service_type', 'discord')
    .limit(1)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('external_integrations')
      .update({
        name: channelName?.trim() || 'Discord Notifications',
        credentials,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
    if (error) return { error: error.message }
    return { success: true }
  }

  const { error } = await supabase.from('external_integrations').insert({
    workspace_id: workspaceId,
    service_type: 'discord',
    name: channelName?.trim() || 'Discord Notifications',
    credentials,
    is_active: true,
  })
  if (error) return { error: error.message }
  return { success: true }
}

export async function sendDiscordTestMessage() {
  const guard = await requireAdminWithWorkspace()
  if ('error' in guard) return { error: guard.error }
  const { supabase, workspaceId } = guard

  const { data: integration } = await supabase
    .from('external_integrations')
    .select('credentials, is_active')
    .eq('workspace_id', workspaceId)
    .eq('service_type', 'discord')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (!integration) return { error: 'Discord nao conectado' }
  const credentials = (integration.credentials as DiscordCredentials | null) ?? null
  const webhookUrl = credentials?.webhook_url
  if (!webhookUrl) return { error: 'Webhook URL do Discord nao configurada' }

  const sent = await sendDiscordNotification({
    webhookUrl,
    title: 'Teste de integração Discord',
    body: 'Conexão concluída com sucesso. O portal já pode enviar notificações reais.',
  })

  if (!sent.sent) return { error: `Falha ao enviar teste: ${sent.reason}` }
  return { success: true }
}
