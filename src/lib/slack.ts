import { createAdminClient } from '@/lib/supabase/server'

type SlackCredentials = {
  bot_token?: string
  team_id?: string
  team_name?: string
  channel_id?: string
  channel_name?: string
}

async function getWorkspaceIdFromProject(projectId: string) {
  const admin = createAdminClient()
  const { data } = await admin.from('projects').select('workspace_id').eq('id', projectId).maybeSingle()
  return data?.workspace_id ?? null
}

async function getSlackIntegrationForWorkspace(workspaceId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('external_integrations')
    .select('id, credentials, is_active')
    .eq('workspace_id', workspaceId)
    .eq('service_type', 'slack')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return null
  return data as { id: string; credentials: SlackCredentials; is_active: boolean }
}

export async function sendSlackNotification(input: {
  projectId?: string
  title: string
  body: string
  fallbackText?: string
}) {
  if (!input.projectId) return { sent: false, reason: 'missing_project_id' }

  const workspaceId = await getWorkspaceIdFromProject(input.projectId)
  if (!workspaceId) return { sent: false, reason: 'workspace_not_found' }

  const integration = await getSlackIntegrationForWorkspace(workspaceId)
  if (!integration) return { sent: false, reason: 'slack_not_connected' }

  const creds = integration.credentials ?? {}
  if (!creds.bot_token || !creds.channel_id) {
    return { sent: false, reason: 'incomplete_credentials' }
  }

  const text = input.fallbackText ?? `${input.title}\n${input.body}`
  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.bot_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel: creds.channel_id,
      text,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: input.title, emoji: true },
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: input.body },
        },
      ],
    }),
  })

  const payload = (await response.json()) as { ok?: boolean; error?: string }
  if (!payload.ok) {
    return { sent: false, reason: payload.error ?? 'slack_api_error' }
  }

  return { sent: true, reason: null }
}
