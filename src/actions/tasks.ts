'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { taskSchema, type TaskInput } from '@/lib/validations'
import { triggerN8nEvent } from '@/lib/n8n'
import { getProfilesByIds, notifyClientPendingTask, notifyTaskStakeholders } from '@/lib/notification-events'
import type { TaskStatus } from '@/types'

function addDaysIso(baseDate: string, days: number) {
  const anchor = baseDate ? new Date(`${baseDate}T12:00:00`) : new Date()
  anchor.setDate(anchor.getDate() + days)
  return anchor.toISOString().slice(0, 10)
}

function recurringPatternToDays(pattern: string | null | undefined, fallback?: number | null) {
  if (typeof fallback === 'number' && fallback >= 1) return fallback
  if (pattern === 'daily') return 1
  if (pattern === 'weekly') return 7
  if (pattern === 'biweekly') return 14
  if (pattern === 'monthly') return 30
  return null
}

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

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '-')
}

export async function createTask(projectId: string, data: TaskInput) {
  const { user, role } = await requireUser()
  if (!user) return { error: 'Nao autenticado' }
  if (role !== 'admin') return { error: 'Acesso negado' }

  const parsed = taskSchema.safeParse(data)
  if (!parsed.success) return { error: 'Dados invalidos' }

  const adminClient = createAdminClient()
  const { data: createdTask, error } = await adminClient.from('tasks').insert({
    ...parsed.data,
    blocked_since: parsed.data.blocked_reason ? new Date().toISOString() : null,
    project_id: projectId,
    created_by: user.id,
    updated_at: new Date().toISOString(),
  }).select('id, title, owner_type, status, assignee_id, mentioned_user_ids').single()

  if (error) return { error: error.message }

  if (createdTask) {
    const stakeholderIds = [createdTask.assignee_id, ...(createdTask.mentioned_user_ids ?? [])].filter(Boolean) as string[]
    const stakeholders = await getProfilesByIds(stakeholderIds)

    if (stakeholders.length > 0) {
      await notifyTaskStakeholders({
        projectId,
        taskId: createdTask.id,
        taskTitle: createdTask.title,
        recipients: stakeholders,
      })
    }

    if (createdTask.owner_type === 'client') {
      await notifyClientPendingTask({
        projectId,
        taskId: createdTask.id,
        taskTitle: createdTask.title,
        status: createdTask.status,
      })
    }
  }

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

  const adminClient = createAdminClient()
  const { data: task } = await adminClient
    .from('tasks')
    .select('id, project_id, phase_id, title, description, status, owner_type, priority, assignee_id, due_date, estimated_hours, remaining_hours, detail_notes, checklist, mentioned_user_ids, task_category, recurring_pattern, recurring_interval_days, recurring_parent_task_id')
    .eq('id', taskId)
    .single()

  if (task?.owner_type === 'client' && (status === 'todo' || status === 'review')) {
    await notifyClientPendingTask({
      projectId,
      taskId: task.id,
      taskTitle: task.title,
      status,
      })
  }

  if (task && status === 'done') {
    const intervalDays = recurringPatternToDays(task.recurring_pattern, task.recurring_interval_days)
    if (intervalDays) {
      const nextDueDate = task.due_date ? addDaysIso(task.due_date, intervalDays) : null
      const recurringRootId = task.recurring_parent_task_id ?? task.id

      await adminClient.from('tasks').insert({
        project_id: task.project_id,
        phase_id: task.phase_id,
        title: task.title,
        description: task.description,
        status: 'todo',
        owner_type: task.owner_type,
        priority: task.priority,
        assignee_id: task.assignee_id,
        due_date: nextDueDate,
        created_by: user.id,
        estimated_hours: task.estimated_hours,
        actual_hours: null,
        remaining_hours: task.remaining_hours,
        detail_notes: task.detail_notes,
        checklist: task.checklist,
        mentioned_user_ids: task.mentioned_user_ids,
        task_category: task.task_category,
        recurring_pattern: task.recurring_pattern,
        recurring_interval_days: intervalDays,
        recurring_parent_task_id: recurringRootId,
        updated_at: new Date().toISOString(),
      })
    }
  }

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

  const shouldNotifyStakeholders = Boolean(data.assignee_id || data.mentioned_user_ids || data.status)
  if (shouldNotifyStakeholders) {
    const { data: task } = await createAdminClient()
      .from('tasks')
      .select('id, title, owner_type, status, assignee_id, mentioned_user_ids')
      .eq('id', taskId)
      .single()

    if (task) {
      const stakeholderIds = [task.assignee_id, ...(task.mentioned_user_ids ?? [])].filter(Boolean) as string[]
      const stakeholders = await getProfilesByIds(stakeholderIds)

      if (stakeholders.length > 0) {
        await notifyTaskStakeholders({
          projectId,
          taskId: task.id,
          taskTitle: task.title,
          recipients: stakeholders,
        })
      }

      if (task.owner_type === 'client' && (task.status === 'todo' || task.status === 'review')) {
        await notifyClientPendingTask({
          projectId,
          taskId: task.id,
          taskTitle: task.title,
          status: task.status,
        })
      }
    }
  }

  revalidatePath(`/projects/${projectId}/tasks`)

  triggerN8nEvent({
    event: 'task.updated',
    projectId,
    taskId,
    data,
  })

  return { success: true }
}

export async function getTaskImageUrl(taskId: string) {
  const { user } = await requireUser()
  if (!user) return { error: 'Nao autenticado', url: null }

  const adminClient = createAdminClient()
  const { data: task, error } = await adminClient
    .from('tasks')
    .select('image_path')
    .eq('id', taskId)
    .single()

  if (error) return { error: error.message, url: null }
  if (!task?.image_path) return { error: null, url: null }

  const { data, error: signedUrlError } = await adminClient
    .storage
    .from('project-files')
    .createSignedUrl(task.image_path, 3600)

  if (signedUrlError) return { error: signedUrlError.message, url: null }
  return { error: null, url: data?.signedUrl ?? null }
}

export async function uploadTaskImage(projectId: string, taskId: string, formData: FormData) {
  const { user, role } = await requireUser()
  if (!user) return { error: 'Nao autenticado' }
  if (role !== 'admin') return { error: 'Acesso negado' }

  const file = formData.get('image') as File | null
  if (!file || file.size === 0) return { error: 'Nenhum arquivo selecionado' }
  if (!file.type.startsWith('image/')) return { error: 'Envie uma imagem valida' }

  const adminClient = createAdminClient()
  const { data: existingTask, error: taskError } = await adminClient
    .from('tasks')
    .select('image_path')
    .eq('id', taskId)
    .eq('project_id', projectId)
    .single()

  if (taskError) return { error: taskError.message }

  const ext = file.name.split('.').pop() ?? 'png'
  const path = `${projectId}/task-assets/${taskId}/${Date.now()}-${sanitizeFileName(file.name || `image.${ext}`)}`

  const { error: uploadError } = await adminClient
    .storage
    .from('project-files')
    .upload(path, file, { upsert: false })

  if (uploadError) return { error: uploadError.message }

  const { error: updateError } = await adminClient
    .from('tasks')
    .update({
      image_path: path,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)

  if (updateError) return { error: updateError.message }

  if (existingTask?.image_path) {
    await adminClient.storage.from('project-files').remove([existingTask.image_path])
  }

  const { data: signedUrl } = await adminClient.storage.from('project-files').createSignedUrl(path, 3600)

  revalidatePath(`/projects/${projectId}/tasks`)
  return { success: true, imagePath: path, imageUrl: signedUrl?.signedUrl ?? null }
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

    const { data: createdRows, error } = await createAdminClient()
      .from('tasks')
      .insert(rows)
      .select('id, title, status, owner_type')
    if (error) return { error: error.message }

    const clientRows = (createdRows ?? []).filter((row) => row.owner_type === 'client')
    await Promise.all(clientRows.map((row) =>
      notifyClientPendingTask({
        projectId,
        taskId: row.id,
        taskTitle: row.title,
        status: row.status,
      })
    ))
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
