'use server'

import { createClient } from '@/lib/supabase/server'
import { sendWhatsAppNotification } from '@/lib/whatsapp'

type WhatsAppCredentials = {
  provider: 'evolution_api'
  base_url: string
  instance: string
  api_key: string
  default_number?: string
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

export async function getWhatsAppIntegrationStatus() {
  const guard = await requireAdminWithWorkspace()
  if ('error' in guard) return { error: guard.error, connected: false }

  const { supabase, workspaceId } = guard
  const { data } = await supabase
    .from('external_integrations')
    .select('id, credentials, is_active, updated_at')
    .eq('workspace_id', workspaceId)
    .eq('service_type', 'whatsapp')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return { connected: false, integration: null, workspaceId }
  return { connected: true, integration: data, workspaceId }
}

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, '')
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, '')
}

export async function saveWhatsAppIntegration(input: {
  baseUrl: string
  instance: string
  apiKey: string
  defaultNumber?: string
}) {
  const guard = await requireAdminWithWorkspace()
  if ('error' in guard) return { error: guard.error }

  const { supabase, workspaceId } = guard
  const baseUrl = normalizeBaseUrl(input.baseUrl)
  const instance = input.instance.trim()
  const apiKey = input.apiKey.trim()
  const defaultNumber = input.defaultNumber?.trim() ? normalizePhone(input.defaultNumber) : undefined

  if (!/^https?:\/\//i.test(baseUrl)) {
    return { error: 'Base URL da Evolution API invalida' }
  }
  if (!instance) return { error: 'Informe o nome da instancia' }
  if (!apiKey) return { error: 'Informe a API Key da Evolution API' }

  const credentials: WhatsAppCredentials = {
    provider: 'evolution_api',
    base_url: baseUrl,
    instance,
    api_key: apiKey,
    default_number: defaultNumber,
  }

  const { data: existing } = await supabase
    .from('external_integrations')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('service_type', 'whatsapp')
    .limit(1)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('external_integrations')
      .update({
        name: 'WhatsApp Business (Evolution API)',
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
    service_type: 'whatsapp',
    name: 'WhatsApp Business (Evolution API)',
    credentials,
    is_active: true,
  })
  if (error) return { error: error.message }
  return { success: true }
}

export async function sendWhatsAppTestMessage(number?: string) {
  const guard = await requireAdminWithWorkspace()
  if ('error' in guard) return { error: guard.error }

  const { supabase, workspaceId } = guard
  const { data: integration } = await supabase
    .from('external_integrations')
    .select('credentials, is_active')
    .eq('workspace_id', workspaceId)
    .eq('service_type', 'whatsapp')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (!integration) return { error: 'WhatsApp nao conectado' }

  const credentials = (integration.credentials as WhatsAppCredentials | null) ?? null
  const targetNumber = number?.trim() ? normalizePhone(number) : credentials?.default_number
  if (!targetNumber) return { error: 'Informe um numero para teste' }

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('workspace_id', workspaceId)
    .limit(1)
    .maybeSingle()

  if (!project?.id) return { error: 'Nao foi encontrado projeto para validar envio' }

  const sent = await sendWhatsAppNotification({
    projectId: project.id,
    number: targetNumber,
    message: 'Teste de integracao WhatsApp via Evolution API concluido com sucesso.',
  })

  if (!sent.sent) return { error: `Falha ao enviar teste: ${sent.reason}` }
  return { success: true }
}
