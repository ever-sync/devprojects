'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const scriptSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(2).max(200),
  description: z.string().optional(),
  channel: z.enum(['whatsapp', 'telegram', 'web', 'voice', 'email']).default('whatsapp'),
  content: z.string().min(1),
  notes: z.string().optional(),
})

const updateScriptSchema = scriptSchema.partial().extend({
  id: z.string().uuid(),
})

async function getProjectWorkspace(supabase: Awaited<ReturnType<typeof createClient>>, projectId: string) {
  const { data: project } = await supabase
    .from('projects')
    .select('workspace_id')
    .eq('id', projectId)
    .single()
  return project?.workspace_id ?? null
}

export async function getAiScripts(projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado', data: null }

  const { data, error } = await supabase
    .from('ai_scripts')
    .select(`
      *,
      creator:created_by(id, full_name, email),
      promoter:promoted_by(id, full_name, email)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message, data: null }
  return { data, error: null }
}

export async function createAiScript(input: z.infer<typeof scriptSchema>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const parsed = scriptSchema.safeParse(input)
  if (!parsed.success) return { error: 'Dados inválidos' }

  const workspaceId = await getProjectWorkspace(supabase, parsed.data.projectId)
  if (!workspaceId) return { error: 'Projeto não encontrado' }

  // Calcular próximo número de versão
  const { count } = await supabase
    .from('ai_scripts')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', parsed.data.projectId)

  const version = (count ?? 0) + 1

  const { data, error } = await supabase
    .from('ai_scripts')
    .insert({
      project_id: parsed.data.projectId,
      workspace_id: workspaceId,
      name: parsed.data.name,
      description: parsed.data.description,
      channel: parsed.data.channel,
      content: parsed.data.content,
      notes: parsed.data.notes,
      version,
      status: 'draft',
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/projects/${parsed.data.projectId}/ai-scripts`)
  return { data, error: null }
}

export async function createScriptVersion(parentId: string, notes: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: parent } = await supabase
    .from('ai_scripts')
    .select('*')
    .eq('id', parentId)
    .single()

  if (!parent) return { error: 'Script não encontrado' }

  // Próxima versão
  const { count } = await supabase
    .from('ai_scripts')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', parent.project_id)

  const { data, error } = await supabase
    .from('ai_scripts')
    .insert({
      project_id: parent.project_id,
      workspace_id: parent.workspace_id,
      name: parent.name,
      description: parent.description,
      channel: parent.channel,
      content: parent.content,
      notes,
      version: (count ?? 0) + 1,
      status: 'draft',
      parent_version_id: parentId,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/projects/${parent.project_id}/ai-scripts`)
  return { data, error: null }
}

export async function updateAiScript(input: z.infer<typeof updateScriptSchema>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const parsed = updateScriptSchema.safeParse(input)
  if (!parsed.success) return { error: 'Dados inválidos' }

  const { id, projectId, ...rest } = parsed.data

  const { data, error } = await supabase
    .from('ai_scripts')
    .update(rest)
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/projects/${projectId ?? data.project_id}/ai-scripts`)
  return { data, error: null }
}

export async function promoteAiScript(
  id: string,
  targetStatus: 'staging' | 'production'
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: script } = await supabase
    .from('ai_scripts')
    .select('project_id, workspace_id, name, channel')
    .eq('id', id)
    .single()

  if (!script) return { error: 'Script não encontrado' }

  // Arquivar script atual em produção/staging (mesmo channel)
  if (targetStatus === 'production') {
    await supabase
      .from('ai_scripts')
      .update({ status: 'archived' })
      .eq('project_id', script.project_id)
      .eq('channel', script.channel)
      .eq('status', 'production')
      .neq('id', id)
  }

  const { data, error } = await supabase
    .from('ai_scripts')
    .update({
      status: targetStatus,
      promoted_by: user.id,
      promoted_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/projects/${script.project_id}/ai-scripts`)
  return { data, error: null }
}

export async function deleteAiScript(id: string, projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase
    .from('ai_scripts')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/projects/${projectId}/ai-scripts`)
  return { error: null }
}
