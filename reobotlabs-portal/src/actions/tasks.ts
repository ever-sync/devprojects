'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { taskSchema, type TaskInput } from '@/lib/validations'
import { triggerN8nEvent } from '@/lib/n8n'
import type { TaskStatus } from '@/types'

function buildTaskPatch(data: Partial<TaskInput>) {
  const shouldClearBlock = data.status === 'done' || data.status === 'review'
  const hasBlockedReason = typeof data.blocked_reason === 'string' && data.blocked_reason.trim().length > 0

  return {
    ...data,
    blocked_reason: shouldClearBlock ? null : data.blocked_reason,
    blocked_since: hasBlockedReason ? new Date().toISOString() : shouldClearBlock ? null : undefined,
    updated_at: new Date().toISOString(),
  }
}

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { supabase, user: null, role: null }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return { supabase, user, role: profile?.role ?? null }
}

export async function createTask(projectId: string, data: TaskInput) {
  const { user, role } = await requireUser()
  if (!user) return { error: 'Nao autenticado' }
  if (role !== 'admin') return { error: 'Acesso negado' }

  const parsed = taskSchema.safeParse(data)
  if (!parsed.success) return { error: 'Dados invalidos' }

  const adminClient = createAdminClient()
  const { error } = await adminClient.from('tasks').insert({
    ...parsed.data,
    blocked_since: parsed.data.blocked_reason ? new Date().toISOString() : null,
    project_id: projectId,
    created_by: user.id,
    updated_at: new Date().toISOString(),
  })

  if (error) return { error: error.message }

  revalidatePath(`/projects/${projectId}/tasks`)
  return { success: true }
}

export async function updateTaskStatus(taskId: string, status: TaskStatus, projectId: string) {
  const { supabase, user, role } = await requireUser()
  if (!user) return { error: 'Nao autenticado' }

  const updatePayload = buildTaskPatch({ status })
  const mutationClient = role === 'admin' ? createAdminClient() : supabase
  const { error } = await mutationClient
    .from('tasks')
    .update(updatePayload)
    .eq('id', taskId)

  if (error) return { error: error.message }

  revalidatePath(`/projects/${projectId}/tasks`)

  triggerN8nEvent({
    event: 'task.status_changed',
    projectId,
    taskId,
    data: { status },
  })

  return { success: true }
}

export async function updateTask(taskId: string, data: Partial<TaskInput>, projectId: string) {
  const { supabase, user, role } = await requireUser()
  if (!user) return { error: 'Nao autenticado' }

  const mutationClient = role === 'admin' ? createAdminClient() : supabase
  const { error } = await mutationClient
    .from('tasks')
    .update(buildTaskPatch(data))
    .eq('id', taskId)

  if (error) return { error: error.message }

  revalidatePath(`/projects/${projectId}/tasks`)

  triggerN8nEvent({
    event: 'task.updated',
    projectId,
    taskId,
    data,
  })

  return { success: true }
}

export async function createTasksBulk({
  projectId,
  title,
  description,
  priority,
  dueDate,
  assigneeIds,
  hasClientAssignee,
}: {
  projectId: string
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  dueDate: string | null
  assigneeIds: string[]
  hasClientAssignee: boolean
}) {
  const { supabase, user, role } = await requireUser()
  if (!user) return { error: 'Nao autenticado' }
  if (role !== 'admin') return { error: 'Acesso negado' }

  const base = {
    project_id: projectId,
    title,
    description,
    priority,
    due_date: dueDate,
    status: 'todo' as const,
    created_by: user.id,
  }

  if (assigneeIds.length === 0) {
    const { error } = await createAdminClient().from('tasks').insert({
      ...base,
      owner_type: 'agency' as const,
    })
    if (error) return { error: error.message }
  } else {
    const { data: assigneeProfiles } = await supabase
      .from('profiles')
      .select('id, role')
      .in('id', assigneeIds)
    const clientUserIds = new Set(
      (assigneeProfiles ?? [])
        .filter((profile) => profile.role === 'client')
        .map((profile) => profile.id),
    )

    const rows = assigneeIds.map((assigneeId) => ({
      ...base,
      assignee_id: assigneeId,
      owner_type: (clientUserIds.has(assigneeId) || hasClientAssignee ? 'client' : 'agency') as 'client' | 'agency',
    }))

    const { error } = await createAdminClient().from('tasks').insert(rows)
    if (error) return { error: error.message }
  }

  revalidatePath(`/projects/${projectId}/tasks`)
  revalidatePath('/dashboard')
  return { success: true }
}

export type AIGeneratedTask = {
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  estimated_days: number | null
}

function getAnthropicModels() {
  return [...new Set([
    process.env.ANTHROPIC_MODEL,
    'claude-3-5-haiku-latest',
    'claude-3-5-sonnet-latest',
  ].filter(Boolean))] as string[]
}

function extractJsonPayload(raw: string) {
  const fencedMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  return (fencedMatch?.[1] ?? raw).trim()
}

export async function generateTasksFromText(text: string) {
  const { user, role } = await requireUser()
  if (!user) return { error: 'Nao autenticado' }
  if (role !== 'admin') return { error: 'Acesso negado' }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { error: 'Chave da API de IA nao configurada' }

  const prompt = `Voce e um assistente especializado em gerenciamento de projetos de tecnologia.

Analise o texto abaixo e extraia todas as tarefas, acoes, itens a fazer ou entregas mencionadas.

Para cada tarefa identificada, retorne um objeto JSON com:
- "title": titulo claro e acionavel (maximo 100 caracteres, ex: "Criar tela de login")
- "description": detalhes relevantes do texto (null se nao houver)
- "priority": "low", "medium", "high" ou "urgent" baseado no contexto
- "estimated_days": prazo em dias a partir de hoje (null se nao mencionado)

Retorne APENAS JSON valido, sem markdown, no formato exato:
{"tasks": [...]}

Regras:
- Seja especifico nos titulos (verbos no infinitivo: "Criar", "Implementar", "Revisar", "Configurar")
- Se mencionar prazos ("ate sexta", "em 3 dias", "semana que vem"), converta para numero de dias
- Foque em acoes concretas, nao em discussoes ou observacoes
- Maximo de 20 tarefas
- Responda em portugues brasileiro

TEXTO:
${text}`

  const models = getAnthropicModels()
  let lastError = 'Nao foi possivel gerar tarefas com IA.'

  for (const model of models) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      lastError = `Erro na API de IA: ${err}`

      if (
        err.includes('model') ||
        err.includes('not_found_error') ||
        err.includes('invalid_request_error')
      ) {
        continue
      }

      return { error: lastError }
    }

    const result = await response.json() as {
      content: Array<{ type: string; text?: string }>
    }

    const raw = result.content
      ?.filter((item) => item.type === 'text' && typeof item.text === 'string')
      .map((item) => item.text ?? '')
      .join('\n')
      .trim()

    if (!raw) {
      lastError = 'A IA nao retornou texto utilizavel.'
      continue
    }

    try {
      const parsed = JSON.parse(extractJsonPayload(raw)) as { tasks: AIGeneratedTask[] }
      if (!Array.isArray(parsed.tasks)) {
        lastError = 'Resposta invalida da IA'
        continue
      }
      return { success: true, tasks: parsed.tasks.slice(0, 20) }
    } catch {
      lastError = 'Nao foi possivel interpretar a resposta da IA. Tente novamente.'
    }
  }

  return { error: lastError }
}

export async function createTasksFromAI(
  projectId: string,
  tasks: Array<{
    title: string
    description: string | null
    priority: 'low' | 'medium' | 'high' | 'urgent'
    due_date: string | null
  }>
) {
  const { user, role } = await requireUser()
  if (!user) return { error: 'Nao autenticado' }
  if (role !== 'admin') return { error: 'Acesso negado' }
  if (tasks.length === 0) return { error: 'Nenhuma tarefa para criar' }

  const rows = tasks.map((task) => ({
    project_id: projectId,
    title: task.title,
    description: task.description,
    priority: task.priority,
    due_date: task.due_date,
    status: 'todo' as const,
    owner_type: 'agency' as const,
    created_by: user.id,
  }))

  const { error } = await createAdminClient().from('tasks').insert(rows)
  if (error) return { error: error.message }

  revalidatePath(`/projects/${projectId}/tasks`)
  revalidatePath('/dashboard')
  return { success: true, count: rows.length }
}

export async function getTasksForExport(projectId: string) {
  const { user, role } = await requireUser()
  if (!user) return { error: 'Nao autenticado' }
  if (role !== 'admin') return { error: 'Acesso negado' }

  const { data, error } = await createAdminClient()
    .from('tasks')
    .select('*, assignee:profiles!tasks_assignee_id_fkey(full_name)')
    .eq('project_id', projectId)
    .order('order_index')

  if (error) return { error: error.message }
  return { success: true, tasks: data ?? [] }
}

export async function deleteTask(taskId: string, projectId: string) {
  const { user, role } = await requireUser()
  if (!user) return { error: 'Nao autenticado' }
  if (role !== 'admin') return { error: 'Acesso negado' }

  const { error } = await createAdminClient().from('tasks').delete().eq('id', taskId)
  if (error) return { error: error.message }

  revalidatePath(`/projects/${projectId}/tasks`)
  return { success: true }
}
