'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/workspace-access'

export async function updateWorkspaceWebhookSettings(input: {
  workspaceId: string
  enabled: boolean
  webhookUrl: string | null
  webhookSecret: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nao autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return { error: 'Acesso negado' }

  const normalizedUrl = input.webhookUrl?.trim() || null
  const normalizedSecret = input.webhookSecret?.trim() || null

  if (normalizedUrl) {
    try {
      new URL(normalizedUrl)
    } catch {
      return { error: 'Informe uma URL valida para o webhook' }
    }
  }

  const { error } = await supabase
    .from('workspaces')
    .update({
      n8n_webhook_enabled: input.enabled,
      n8n_webhook_url: normalizedUrl,
      n8n_webhook_secret: normalizedSecret,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.workspaceId)

  if (error) return { error: error.message }

  await createAuditLog(supabase, {
    workspaceId: input.workspaceId,
    actorUserId: user.id,
    entityType: 'workspace',
    entityId: input.workspaceId,
    action: 'workspace.webhook_updated',
    metadata: {
      enabled: input.enabled,
      webhookUrl: normalizedUrl,
      hasSecret: Boolean(normalizedSecret),
    },
  })

  revalidatePath('/settings')
  revalidatePath('/settings/webhooks')
  return { success: true }
}
