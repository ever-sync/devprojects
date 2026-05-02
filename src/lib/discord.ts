import { createAdminClient } from '@/lib/supabase/server'

type DiscordCredentials = {
  webhook_url?: string
}

async function getWorkspaceIdFromProject(projectId: string) {
  const admin = createAdminClient()
  const { data } = await admin.from('projects').select('workspace_id').eq('id', projectId).maybeSingle()
  return data?.workspace_id ?? null
}

async function getDiscordIntegrationForWorkspace(workspaceId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('external_integrations')
    .select('id, credentials, is_active')
    .eq('workspace_id', workspaceId)
    .eq('service_type', 'discord')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return null
  return data as { id: string; credentials: DiscordCredentials; is_active: boolean }
}

export async function sendDiscordNotification(input: {
  projectId?: string
  webhookUrl?: string
  title: string
  body: string
}) {
  let webhookUrl = input.webhookUrl

  if (!webhookUrl) {
    if (!input.projectId) return { sent: false, reason: 'missing_project_id' }
    const workspaceId = await getWorkspaceIdFromProject(input.projectId)
    if (!workspaceId) return { sent: false, reason: 'workspace_not_found' }
    const integration = await getDiscordIntegrationForWorkspace(workspaceId)
    if (!integration) return { sent: false, reason: 'discord_not_connected' }
    webhookUrl = integration.credentials?.webhook_url
  }

  if (!webhookUrl) return { sent: false, reason: 'missing_webhook_url' }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [
        {
          title: input.title,
          description: input.body,
          color: 3447003,
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  })

  if (!response.ok) {
    return { sent: false, reason: `discord_http_${response.status}` }
  }

  return { sent: true, reason: null }
}
