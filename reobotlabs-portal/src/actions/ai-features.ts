'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Schema para geração de documentos PDF
const generateDocumentSchema = z.object({
  projectId: z.string().uuid(),
  documentType: z.enum(['scope_pdf', 'proposal_pdf', 'invoice_pdf', 'report_pdf']),
  title: z.string().min(2).max(300),
  description: z.string().optional(),
  contentHtml: z.string(),
  contentMarkdown: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

// Schema para análise de processos com IA
const analyzeProcessSchema = z.object({
  projectId: z.string().uuid(),
  analysisType: z.enum(['bottleneck_detection', 'risk_analysis', 'efficiency_report']),
  inputData: z.record(z.any()),
  customInstructions: z.string().optional(),
})

// Schema para geração de tarefas com IA
const generateTasksSchema = z.object({
  projectId: z.string().uuid(),
  phaseId: z.string().uuid().optional(),
  sourceType: z.enum(['meeting_transcript', 'document_analysis', 'github_analysis', 'user_prompt']),
  sourceId: z.string().optional(),
  originalInput: z.string(),
  customInstructions: z.string().optional(),
})

// Schema para análise de GitHub com IA
const analyzeGitHubSchema = z.object({
  repositoryId: z.string().uuid(),
  projectId: z.string().uuid(),
  analysisType: z.enum(['code_quality', 'security_audit', 'tech_debt', 'pr_review', 'commit_analysis']),
  githubData: z.record(z.any()),
  customInstructions: z.string().optional(),
})

/**
 * Gera um documento PDF (escopo, proposta, etc)
 */
export async function generatePdfDocument(data: z.infer<typeof generateDocumentSchema>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Não autenticado' }
  }

  const parsed = generateDocumentSchema.safeParse(data)
  if (!parsed.success) {
    return { error: 'Dados inválidos', details: parsed.error.errors }
  }

  // Verificar acesso ao projeto
  const { data: project } = await supabase
    .from('projects')
    .select('workspace_id')
    .eq('id', data.projectId)
    .single()

  if (!project) {
    return { error: 'Projeto não encontrado' }
  }

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', project.workspace_id)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return { error: 'Acesso negado ao projeto' }
  }

  // Aqui você integraria com uma biblioteca de geração de PDF
  // Exemplos: puppeteer, react-pdf, pdfmake, ou serviço externo como Documint
  
  // Por enquanto, vamos apenas registrar o documento
  const { document, error } = await supabase
    .from('generated_documents')
    .insert({
      project_id: data.projectId,
      document_type: data.documentType,
      title: data.title,
      description: data.description,
      file_path: `/documents/${data.projectId}/${Date.now()}_${data.documentType}.pdf`,
      generated_by_ai: false,
      version: 1,
      is_latest: true,
      metadata: data.metadata ?? {},
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Marcar versões anteriores como não-latest
  await supabase
    .from('generated_documents')
    .update({ is_latest: false })
    .eq('project_id', data.projectId)
    .eq('document_type', data.documentType)
    .neq('id', document.id)

  revalidatePath(`/projects/${data.projectId}/documents`)
  revalidatePath(`/projects/${data.projectId}/scope`)
  
  return { success: true, document }
}

/**
 * Analisa processo do projeto com IA
 */
export async function analyzeProjectProcess(data: z.infer<typeof analyzeProcessSchema>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Não autenticado' }
  }

  const parsed = analyzeProcessSchema.safeParse(data)
  if (!parsed.success) {
    return { error: 'Dados inválidos', details: parsed.error.errors }
  }

  // Verificar acesso e permissão
  const { data: project } = await supabase
    .from('projects')
    .select('workspace_id')
    .eq('id', data.projectId)
    .single()

  if (!project) {
    return { error: 'Projeto não encontrado' }
  }

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', project.workspace_id)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'admin', 'manager'].includes(membership.role)) {
    return { error: 'Permissão negada' }
  }

  // Obter configurações de IA do workspace
  const { data: aiSettings } = await supabase
    .from('workspace_ai_settings')
    .select('*')
    .eq('workspace_id', project.workspace_id)
    .single()

  if (!aiSettings || !aiSettings.is_active) {
    return { error: 'IA não está configurada para este workspace' }
  }

  // Criar registro de análise
  const { analysis, error } = await supabase
    .from('process_analyses')
    .insert({
      project_id: data.projectId,
      analysis_type: data.analysisType,
      status: 'pending',
      ai_model_used: aiSettings.model_preference,
      input_data: data.inputData,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Aqui você chamaria a API de IA em background
  // Isso seria feito via webhook, fila ou server action assíncrona
  // Por enquanto, retornamos o ID da análise para processamento posterior
  
  revalidatePath(`/projects/${data.projectId}/analytics`)
  revalidatePath(`/projects/${data.projectId}/productivity`)
  
  return { success: true, analysisId: analysis.id, status: 'processing' }
}

/**
 * Gera tarefas a partir de texto usando IA
 */
export async function generateTasksWithAI(data: z.infer<typeof generateTasksSchema>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Não autenticado' }
  }

  const parsed = generateTasksSchema.safeParse(data)
  if (!parsed.success) {
    return { error: 'Dados inválidos', details: parsed.error.errors }
  }

  // Verificar acesso ao projeto
  const { data: project } = await supabase
    .from('projects')
    .select('workspace_id')
    .eq('id', data.projectId)
    .single()

  if (!project) {
    return { error: 'Projeto não encontrado' }
  }

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', project.workspace_id)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return { error: 'Acesso negado' }
  }

  // Obter configurações de IA
  const { data: aiSettings } = await supabase
    .from('workspace_ai_settings')
    .select('*')
    .eq('workspace_id', project.workspace_id)
    .single()

  if (!aiSettings || !aiSettings.is_active) {
    return { error: 'IA não está configurada para este workspace' }
  }

  // Prompt para IA gerar tarefas
  const prompt = `
    ${data.customInstructions ? `Instruções: ${data.customInstructions}\n\n` : ''}
    Com base no seguinte input, gere uma lista de tarefas estruturadas para um projeto:
    
    ${data.originalInput}
    
    Retorne no formato JSON:
    [
      {
        "title": "Título da tarefa",
        "description": "Descrição detalhada",
        "priority": "low|medium|high|urgent",
        "estimatedHours": number,
        "phaseId": "${data.phaseId || ''}",
        "assigneeRole": "role sugerido"
      }
    ]
  `

  // Aqui você chamaria a API da IA (OpenAI, Anthropic, etc)
  // Por simplicidade, vamos simular a resposta
  const suggestedTasks = [
    {
      title: 'Tarefa gerada por IA exemplo',
      description: 'Esta é uma tarefa de exemplo gerada a partir do input',
      priority: 'medium',
      estimatedHours: 4,
      confidenceScore: 0.85,
    },
  ]

  // Registrar tarefas geradas
  const { aiTask, error } = await supabase
    .from('ai_generated_tasks')
    .insert({
      project_id: data.projectId,
      phase_id: data.phaseId,
      source_type: data.sourceType,
      source_id: data.sourceId,
      original_input: data.originalInput,
      ai_model_used: aiSettings.model_preference,
      suggested_tasks: suggestedTasks,
      processing_status: 'processed',
      confidence_score: 0.85,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Log de uso de IA
  await supabase.from('ai_usage_logs').insert({
    workspace_id: project.workspace_id,
    user_id: user.id,
    feature_type: 'task_generation',
    ai_model_used: aiSettings.model_preference,
    tokens_input: Math.ceil(data.originalInput.length / 4),
    tokens_output: 100, // estimado
    tokens_total: Math.ceil(data.originalInput.length / 4) + 100,
    success: true,
  })

  revalidatePath(`/projects/${data.projectId}/tasks`)
  
  return { 
    success: true, 
    aiTaskId: aiTask.id,
    suggestedTasks,
    message: `${suggestedTasks.length} tarefa(s) gerada(s). Revise e aceite as que desejar.`
  }
}

/**
 * Aceita tarefas geradas por IA e as converte em tarefas reais
 */
export async function acceptAITasks(
  aiTaskId: string,
  taskIndicesToAccept: number[]
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Não autenticado' }
  }

  // Obter tarefas geradas
  const { data: aiTask } = await supabase
    .from('ai_generated_tasks')
    .select('*')
    .eq('id', aiTaskId)
    .single()

  if (!aiTask) {
    return { error: 'Tarefa IA não encontrada' }
  }

  // Verificar permissão
  const { data: project } = await supabase
    .from('projects')
    .select('workspace_id')
    .eq('id', aiTask.project_id)
    .single()

  if (!project) {
    return { error: 'Projeto não encontrado' }
  }

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', project.workspace_id)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'admin', 'manager'].includes(membership.role)) {
    return { error: 'Permissão negada' }
  }

  const suggestedTasks = aiTask.suggested_tasks as any[]
  const acceptedIds: string[] = []

  // Criar tarefas aceitas
  for (const index of taskIndicesToAccept) {
    if (index >= 0 && index < suggestedTasks.length) {
      const taskData = suggestedTasks[index]
      
      const { data: newTask } = await supabase
        .from('tasks')
        .insert({
          project_id: aiTask.project_id,
          phase_id: aiTask.phase_id,
          title: taskData.title,
          description: taskData.description,
          priority: taskData.priority,
          estimated_hours: taskData.estimatedHours,
          status: 'backlog',
          created_by: user.id,
        })
        .select()
        .single()

      if (newTask) {
        acceptedIds.push(newTask.id)
      }
    }
  }

  // Atualizar registro de tarefas IA
  await supabase
    .from('ai_generated_tasks')
    .update({
      accepted_task_ids: acceptedIds,
      processing_status: 'processed',
      processed_at: new Date().toISOString(),
    })
    .eq('id', aiTaskId)

  revalidatePath(`/projects/${aiTask.project_id}/tasks`)
  
  return { success: true, acceptedCount: acceptedIds.length, acceptedIds }
}

/**
 * Analisa repositório GitHub com IA
 */
export async function analyzeGitHubWithAI(data: z.infer<typeof analyzeGitHubSchema>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Não autenticado' }
  }

  const parsed = analyzeGitHubSchema.safeParse(data)
  if (!parsed.success) {
    return { error: 'Dados inválidos', details: parsed.error.errors }
  }

  // Verificar acesso ao projeto
  const { data: project } = await supabase
    .from('projects')
    .select('workspace_id')
    .eq('id', data.projectId)
    .single()

  if (!project) {
    return { error: 'Projeto não encontrado' }
  }

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', project.workspace_id)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'admin', 'manager'].includes(membership.role)) {
    return { error: 'Permissão negada' }
  }

  // Obter configurações de IA
  const { data: aiSettings } = await supabase
    .from('workspace_ai_settings')
    .select('*')
    .eq('workspace_id', project.workspace_id)
    .single()

  if (!aiSettings || !aiSettings.is_active) {
    return { error: 'IA não está configurada para este workspace' }
  }

  // Criar registro de análise
  const { analysis, error } = await supabase
    .from('github_ai_analyses')
    .insert({
      repository_id: data.repositoryId,
      project_id: data.projectId,
      analysis_type: data.analysisType,
      status: 'pending',
      ai_model_used: aiSettings.model_preference,
      github_data: data.githubData,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Aqui você chamaria a API de IA para analisar o código
  // Isso seria feito em background via webhook ou fila
  
  revalidatePath(`/projects/${data.projectId}/git`)
  revalidatePath(`/projects/${data.projectId}/execution`)
  
  return { success: true, analysisId: analysis.id, status: 'processing' }
}

/**
 * Obtém resultados de análise de GitHub
 */
export async function getGitHubAnalysisResults(analysisId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('github_ai_analyses')
    .select(`
      *,
      project_repositories (
        repo_name,
        repo_url
      )
    `)
    .eq('id', analysisId)
    .single()

  if (error) {
    return { error: error.message }
  }

  return { analysis: data }
}

/**
 * Configura preferências de IA do workspace
 */
export async function configureWorkspaceAI(data: {
  workspaceId: string
  aiProvider?: 'openai' | 'anthropic' | 'google' | 'azure'
  modelPreference?: string
  maxTokens?: number
  temperature?: number
  enableAutoTaskGeneration?: boolean
  enableCodeAnalysis?: boolean
  enableProcessAnalysis?: boolean
  enableContractGeneration?: boolean
  customInstructions?: string
  usageLimitMonthly?: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Não autenticado' }
  }

  // Verificar permissão de admin
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', data.workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return { error: 'Permissão negada. Apenas admins podem configurar IA.' }
  }

  // Verificar se já existe configuração
  const { data: existing } = await supabase
    .from('workspace_ai_settings')
    .select('id')
    .eq('workspace_id', data.workspaceId)
    .single()

  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  }

  if (data.aiProvider !== undefined) updateData.ai_provider = data.aiProvider
  if (data.modelPreference !== undefined) updateData.model_preference = data.modelPreference
  if (data.maxTokens !== undefined) updateData.max_tokens = data.maxTokens
  if (data.temperature !== undefined) updateData.temperature = data.temperature
  if (data.enableAutoTaskGeneration !== undefined) updateData.enable_auto_task_generation = data.enableAutoTaskGeneration
  if (data.enableCodeAnalysis !== undefined) updateData.enable_code_analysis = data.enableCodeAnalysis
  if (data.enableProcessAnalysis !== undefined) updateData.enable_process_analysis = data.enableProcessAnalysis
  if (data.enableContractGeneration !== undefined) updateData.enable_contract_generation = data.enableContractGeneration
  if (data.customInstructions !== undefined) updateData.custom_instructions = data.customInstructions
  if (data.usageLimitMonthly !== undefined) updateData.usage_limit_monthly = data.usageLimitMonthly

  let result
  if (existing) {
    const { data: updated, error } = await supabase
      .from('workspace_ai_settings')
      .update(updateData)
      .eq('id', existing.id)
      .select()
      .single()
    
    if (error) return { error: error.message }
    result = updated
  } else {
    const { data: created, error } = await supabase
      .from('workspace_ai_settings')
      .insert({
        workspace_id: data.workspaceId,
        ai_provider: data.aiProvider ?? 'openai',
        model_preference: data.modelPreference ?? 'gpt-4o',
        max_tokens: data.maxTokens ?? 4096,
        temperature: data.temperature ?? 0.7,
        enable_auto_task_generation: data.enableAutoTaskGeneration ?? false,
        enable_code_analysis: data.enableCodeAnalysis ?? true,
        enable_process_analysis: data.enableProcessAnalysis ?? true,
        enable_contract_generation: data.enableContractGeneration ?? true,
        custom_instructions: data.customInstructions,
        usage_limit_monthly: data.usageLimitMonthly,
      })
      .select()
      .single()
    
    if (error) return { error: error.message }
    result = created
  }

  revalidatePath('/settings/ai')
  
  return { success: true, settings: result }
}

/**
 * Obtém configurações de IA do workspace
 */
export async function getWorkspaceAISettings(workspaceId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('workspace_ai_settings')
    .select('*')
    .eq('workspace_id', workspaceId)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    return { error: error.message }
  }

  return { settings: data }
}
