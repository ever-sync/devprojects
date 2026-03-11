import { createAdminClient } from '@/lib/supabase/server'

async function resolveWebhookConfig(projectId?: string, workspaceId?: string) {
  const adminClient = createAdminClient()

  let targetWorkspaceId = workspaceId ?? null
  if (!targetWorkspaceId && projectId) {
    const { data: project } = await adminClient
      .from('projects')
      .select('workspace_id')
      .eq('id', projectId)
      .single()

    targetWorkspaceId = project?.workspace_id ?? null
  }

  if (targetWorkspaceId) {
    const { data: workspace } = await adminClient
      .from('workspaces')
      .select('n8n_webhook_enabled, n8n_webhook_url, n8n_webhook_secret')
      .eq('id', targetWorkspaceId)
      .single()

    if (workspace?.n8n_webhook_enabled && workspace.n8n_webhook_url) {
      return {
        webhookUrl: workspace.n8n_webhook_url,
        webhookSecret: workspace.n8n_webhook_secret,
      }
    }
  }

  return {
    webhookUrl: process.env.N8N_OUTBOUND_WEBHOOK_URL,
    webhookSecret: process.env.N8N_WEBHOOK_SECRET,
  }
}

/**
 * Sends an event to n8n outbound webhook so n8n can trigger WhatsApp/email notifications.
 * Fails silently and never blocks the main operation.
 */
export async function triggerN8nEvent(payload: {
  event: string
  projectId?: string
  workspaceId?: string
  taskId?: string
  userId?: string
  data?: Record<string, unknown>
}) {
  const { webhookUrl, webhookSecret } = await resolveWebhookConfig(payload.projectId, payload.workspaceId)
  if (!webhookUrl) return

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(webhookSecret ? { Authorization: `Bearer ${webhookSecret}` } : {}),
      },
      body: JSON.stringify(payload),
    })
  } catch {
    // Silent fail - notification is non-critical
  }
}
