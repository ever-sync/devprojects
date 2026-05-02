import { createAdminClient } from '@/lib/supabase/server'

type WhatsAppCredentials = {
  provider?: 'evolution_api'
  base_url?: string
  instance?: string
  api_key?: string
  default_number?: string
}

async function getWorkspaceIdFromProject(projectId: string) {
  const admin = createAdminClient()
  const { data } = await admin.from('projects').select('workspace_id').eq('id', projectId).maybeSingle()
  return data?.workspace_id ?? null
}

async function getWhatsAppIntegrationForWorkspace(workspaceId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('external_integrations')
    .select('id, credentials, is_active')
    .eq('workspace_id', workspaceId)
    .eq('service_type', 'whatsapp')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return null
  return data as { id: string; credentials: WhatsAppCredentials; is_active: boolean }
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, '')
}

export async function sendWhatsAppNotification(input: {
  projectId?: string
  number?: string
  message: string
}) {
  if (!input.projectId) return { sent: false, reason: 'missing_project_id' }

  const workspaceId = await getWorkspaceIdFromProject(input.projectId)
  if (!workspaceId) return { sent: false, reason: 'workspace_not_found' }

  const integration = await getWhatsAppIntegrationForWorkspace(workspaceId)
  if (!integration) return { sent: false, reason: 'whatsapp_not_connected' }

  const creds = integration.credentials ?? {}
  const baseUrl = creds.base_url
  const instance = creds.instance
  const apiKey = creds.api_key
  const number = input.number ?? creds.default_number

  if (!baseUrl || !instance || !apiKey) {
    return { sent: false, reason: 'incomplete_credentials' }
  }
  if (!number) {
    return { sent: false, reason: 'missing_destination_number' }
  }

  const endpoint = `${normalizeBaseUrl(baseUrl)}/message/sendText/${encodeURIComponent(instance)}`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: apiKey,
    },
    body: JSON.stringify({
      number,
      text: input.message,
    }),
  })

  if (!response.ok) {
    return { sent: false, reason: `whatsapp_http_${response.status}` }
  }

  return { sent: true, reason: null }
}
