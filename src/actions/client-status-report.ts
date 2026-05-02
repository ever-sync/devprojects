'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { z } from 'zod'
import { sendEmail, buildStatusReportEmail } from '@/lib/email'

const generateReportSchema = z.object({
  projectId: z.string().uuid(),
  periodStart: z.string(),
  periodEnd: z.string(),
  customInstructions: z.string().optional(),
})

const saveReportSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(2),
  periodStart: z.string(),
  periodEnd: z.string(),
  contentMarkdown: z.string(),
  highlights: z.array(z.string()).optional(),
  blockers: z.array(z.string()).optional(),
  nextSteps: z.array(z.string()).optional(),
})

export async function getStatusReports(projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado', data: null }

  const { data, error } = await supabase
    .from('client_status_reports')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message, data: null }
  return { data, error: null }
}

export async function generateStatusReport(input: z.infer<typeof generateReportSchema>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado', data: null }

  const parsed = generateReportSchema.safeParse(input)
  if (!parsed.success) return { error: 'Dados inválidos', data: null }

  // Buscar dados do projeto para contexto
  const { data: project } = await supabase
    .from('projects')
    .select('*, clients(name)')
    .eq('id', parsed.data.projectId)
    .single()

  if (!project) return { error: 'Projeto não encontrado', data: null }

  // Buscar tasks concluídas no período
  const { data: tasks } = await supabase
    .from('tasks')
    .select('title, status, assignee_id, updated_at')
    .eq('project_id', parsed.data.projectId)
    .gte('updated_at', parsed.data.periodStart)
    .lte('updated_at', parsed.data.periodEnd)
    .order('updated_at', { ascending: false })

  // Buscar aprovações no período
  const { data: approvals } = await supabase
    .from('approvals')
    .select('title, status, created_at')
    .eq('project_id', parsed.data.projectId)
    .gte('created_at', parsed.data.periodStart)
    .lte('created_at', parsed.data.periodEnd)

  // Buscar horas lançadas no período
  const { data: timeEntries } = await supabase
    .from('time_entries')
    .select('hours, description, date')
    .eq('project_id', parsed.data.projectId)
    .gte('date', parsed.data.periodStart)
    .lte('date', parsed.data.periodEnd)

  const totalHours = (timeEntries ?? []).reduce((sum, t) => sum + Number(t.hours ?? 0), 0)
  const doneTasks = (tasks ?? []).filter(t => t.status === 'done')
  const blockedTasks = (tasks ?? []).filter(t => t.status === 'blocked' || t.status === 'backlog')

  const contextData = {
    project: {
      name: project.name,
      type: project.type,
      progress: project.progress_percent,
      health: project.health,
      client: (project.clients as { name: string } | null)?.name,
    },
    period: { start: parsed.data.periodStart, end: parsed.data.periodEnd },
    tasks: {
      total: tasks?.length ?? 0,
      done: doneTasks.length,
      inProgress: (tasks ?? []).filter(t => t.status === 'in_progress').length,
      blocked: blockedTasks.length,
      list: doneTasks.slice(0, 10).map(t => t.title),
    },
    approvals: {
      total: approvals?.length ?? 0,
      approved: (approvals ?? []).filter(a => a.status === 'approved').length,
      pending: (approvals ?? []).filter(a => a.status === 'pending').length,
    },
    hours: { total: totalHours },
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const systemPrompt = `Você é um gerente de projetos que escreve relatórios de status claros e objetivos para clientes.
Escreva em português brasileiro, tom profissional mas acessível.
O relatório deve ser conciso (máximo 400 palavras), focado em resultados e próximos passos.
Formate em Markdown. Inclua: resumo do período, o que foi entregue, bloqueios (se houver), e próximos passos.`

  const userPrompt = `Gere um relatório de status para o cliente com base nos dados abaixo:
${JSON.stringify(contextData, null, 2)}
${parsed.data.customInstructions ? `\nInstruções adicionais: ${parsed.data.customInstructions}` : ''}`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.5,
      max_tokens: 1000,
    })

    const content = completion.choices[0].message.content ?? ''

    // Extrair highlights, blockers, next steps do conteúdo (simplificado)
    const highlights = doneTasks.slice(0, 5).map(t => t.title)
    const blockers = blockedTasks.slice(0, 3).map(t => t.title)

    return {
      data: {
        contentMarkdown: content,
        highlights,
        blockers,
        nextSteps: [],
        context: contextData,
      },
      error: null,
    }
  } catch (err) {
    return { error: `Erro ao gerar relatório: ${err}`, data: null }
  }
}

export async function saveStatusReport(input: z.infer<typeof saveReportSchema>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const parsed = saveReportSchema.safeParse(input)
  if (!parsed.success) return { error: 'Dados inválidos' }

  const { data: project } = await supabase
    .from('projects')
    .select('workspace_id')
    .eq('id', parsed.data.projectId)
    .single()

  if (!project) return { error: 'Projeto não encontrado' }

  const { data, error } = await supabase
    .from('client_status_reports')
    .insert({
      project_id: parsed.data.projectId,
      workspace_id: project.workspace_id,
      title: parsed.data.title,
      period_start: parsed.data.periodStart,
      period_end: parsed.data.periodEnd,
      content_markdown: parsed.data.contentMarkdown,
      highlights: parsed.data.highlights ?? [],
      blockers: parsed.data.blockers ?? [],
      next_steps: parsed.data.nextSteps ?? [],
      status: 'draft',
      generated_by: user.id,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/projects/${parsed.data.projectId}/reports`)
  return { data, error: null }
}

export async function markReportSent(id: string, sentTo: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  // Buscar relatório e dados do projeto para o email
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: report } = await (supabase as any)
    .from('client_status_reports')
    .select('*, projects(name, clients(name, email))')
    .eq('id', id)
    .single() as { data: Record<string, any> | null }

  if (!report) return { error: 'Relatório não encontrado' }

  const project = report.projects as { name: string; clients: { name: string; email: string } | null } | null
  const clientName = project?.clients?.name ?? 'Cliente'
  const projectName = project?.name ?? 'Projeto'
  const clientEmail = project?.clients?.email

  // Enviar email para cada destinatário
  const recipients = sentTo.length > 0 ? sentTo : (clientEmail ? [clientEmail] : [])

  if (recipients.length > 0) {
    const { html } = buildStatusReportEmail({
      clientName,
      projectName,
      periodStart: new Date(report.period_start as string).toLocaleDateString('pt-BR'),
      periodEnd: new Date(report.period_end as string).toLocaleDateString('pt-BR'),
      contentMarkdown: (report.content_markdown as string) ?? '',
      highlights: (report.highlights as string[]) ?? [],
      nextSteps: (report.next_steps as string[]) ?? [],
    })

    const emailResult = await sendEmail({
      to: recipients,
      subject: `Relatório de Status — ${projectName}`,
      html,
    })

    if (emailResult.error) {
      return { error: `Erro ao enviar email: ${emailResult.error}` }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('client_status_reports')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      sent_to: recipients,
    })
    .eq('id', id)
    .select('project_id')
    .single() as { data: { project_id: string } | null; error: Error | null }

  if (error) return { error: (error as Error).message }

  revalidatePath(`/projects/${(data as { project_id: string }).project_id}/reports`)
  return { error: null }
}

export async function deleteStatusReport(id: string, projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase
    .from('client_status_reports')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/projects/${projectId}/reports`)
  return { error: null }
}
