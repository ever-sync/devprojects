'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import OpenAI from 'openai';
import { z } from 'zod';

// Schemas de validação
const ContractTemplateSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  content: z.string().min(50),
  variables: z.array(z.string()).default([]),
  category: z.enum(['service', 'nda', 'proposal', 'statement_of_work']),
});

const GenerateContractSchema = z.object({
  templateId: z.string().uuid(),
  projectId: z.string().uuid(),
  variables: z.record(z.string(), z.string()),
  title: z.string().min(3),
});

const AnalyzeProcessSchema = z.object({
  projectId: z.string().uuid(),
  description: z.string().min(20),
  goals: z.array(z.string()).optional(),
});

const GenerateTasksSchema = z.object({
  projectId: z.string().uuid(),
  description: z.string().min(20),
  context: z.string().optional(),
});

const AnalyzeGitHubSchema = z.object({
  repositoryUrl: z.string().url(),
  branch: z.string().default('main'),
  focus: z.enum(['code_quality', 'security', 'performance', 'architecture', 'all']).default('all'),
});

// Inicializar OpenAI (lazy loading)
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY não configurada no ambiente');
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * Cria um novo template de contrato
 */
export async function createContractTemplate(data: z.infer<typeof ContractTemplateSchema>) {
  try {
    const supabase = await createClient();
    
    // Validar dados
    const validated = ContractTemplateSchema.parse(data);
    
    // Obter usuário atual
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autorizado');

    // Obter workspace do usuário
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .single();

    if (!membership) throw new Error('Usuário não é owner de nenhum workspace');

    // Criar template
    const { data: template, error } = await supabase
      .from('contract_templates')
      .insert({
        workspace_id: membership.workspace_id,
        name: validated.name,
        description: validated.description,
        content: validated.content,
        variables: validated.variables,
        category: validated.category,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/contracts');
    return { success: true, data: template };
  } catch (error) {
    console.error('Erro ao criar template:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
}

/**
 * Gera um contrato a partir de um template
 */
export async function generateContract(data: z.infer<typeof GenerateContractSchema>) {
  try {
    const supabase = await createClient();
    
    const validated = GenerateContractSchema.parse(data);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autorizado');

    // Buscar template
    const { data: template } = await supabase
      .from('contract_templates')
      .select('*')
      .eq('id', validated.templateId)
      .single();

    if (!template) throw new Error('Template não encontrado');

    // Substituir variáveis no conteúdo
    let content = template.content;
    Object.entries(validated.variables).forEach(([key, value]) => {
      content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });

    // Gerar título se não fornecido
    const title = validated.title || `${template.name} - ${new Date().toLocaleDateString('pt-BR')}`;

    // Criar contrato
    const { data: contract, error } = await supabase
      .from('contracts')
      .insert({
        project_id: validated.projectId,
        template_id: validated.templateId,
        title,
        content,
        variables_used: validated.variables,
        status: 'draft',
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/contracts');
    return { success: true, data: contract };
  } catch (error) {
    console.error('Erro ao gerar contrato:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
}

/**
 * Analisa um processo usando IA e sugere melhorias
 */
export async function analyzeProcessWithAI(data: z.infer<typeof AnalyzeProcessSchema>) {
  try {
    const supabase = await createClient();
    const validated = AnalyzeProcessSchema.parse(data);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autorizado');

    // Buscar detalhes do projeto para contexto
    const { data: project } = await supabase
      .from('projects')
      .select('name, description, status')
      .eq('id', validated.projectId)
      .single();

    if (!project) throw new Error('Projeto não encontrado');

    const openai = getOpenAIClient();

    // Prompt para análise de processo
    const prompt = `
Você é um especialista em otimização de processos de desenvolvimento de software.

CONTEXTO DO PROJETO:
- Nome: ${project.name}
- Descrição: ${project.description || 'Não informada'}
- Status: ${project.status}

PROCESSO A ANALISAR:
${validated.description}

${validated.goals && validated.goals.length > 0 ? `OBJETIVOS:\n${validated.goals.map(g => `- ${g}`).join('\n')}` : ''}

TAREFA:
Analise este processo e identifique:
1. Gargalos potenciais
2. Riscos de atraso
3. Sugestões de melhoria
4. Métricas recomendadas para acompanhamento
5. Automações possíveis

FORMATO DE RESPOSTA (JSON):
{
  "summary": "Resumo executivo da análise",
  "bottlenecks": ["lista de gargalos"],
  "risks": [{"description": "descrição", "severity": "low|medium|high", "mitigation": "sugestão"}],
  "improvements": [{"title": "título", "description": "descrição", "effort": "low|medium|high", "impact": "low|medium|high"}],
  "metrics": ["lista de métricas recomendadas"],
  "automations": ["lista de automações sugeridas"]
}
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: 'Você é um consultor sênior de processos ágeis. Responda sempre em JSON válido.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const analysis = JSON.parse(completion.choices[0].message.content || '{}');

    // Salvar análise no banco
    const { data: savedAnalysis, error } = await supabase
      .from('process_analyses')
      .insert({
        project_id: validated.projectId,
        description: validated.description,
        goals: validated.goals,
        ai_summary: analysis.summary,
        bottlenecks: analysis.bottlenecks,
        risks: analysis.risks,
        improvements: analysis.improvements,
        metrics: analysis.metrics,
        automations: analysis.automations,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath(`/projects/${validated.projectId}/analysis`);
    return { success: true, data: savedAnalysis, analysis };
  } catch (error) {
    console.error('Erro na análise de processo:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro na análise' 
    };
  }
}

/**
 * Gera tarefas automaticamente a partir de uma descrição usando IA
 */
export async function generateTasksWithAI(data: z.infer<typeof GenerateTasksSchema>) {
  try {
    const supabase = await createClient();
    const validated = GenerateTasksSchema.parse(data);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autorizado');

    // Buscar detalhes do projeto
    const { data: project } = await supabase
      .from('projects')
      .select('name, description, phases(id, name)')
      .eq('id', validated.projectId)
      .single();

    if (!project) throw new Error('Projeto não encontrado');

    const openai = getOpenAIClient();

    const prompt = `
Você é um gerente de projetos experiente especializado em decomposição de escopo.

PROJETO:
- Nome: ${project.name}
- Descrição: ${project.description || 'Não informada'}
${project.phases && project.phases.length > 0 ? `- Fases existentes: ${project.phases.map((p: any) => p.name).join(', ')}` : ''}

DESCRIÇÃO DO ESCOPO/FEATURE:
${validated.description}

${validated.context ? `CONTEXTO ADICIONAL:\n${validated.context}` : ''}

TAREFA:
Decomponha esta descrição em tarefas específicas, acionáveis e bem definidas. Para cada tarefa, inclua:
- Título claro e objetivo
- Descrição detalhada do que precisa ser feito
- Critérios de aceite (definition of done)
- Estimativa de esforço em horas
- Prioridade (critical, high, medium, low)
- Fase sugerida (se aplicável)
- Skills necessárias (frontend, backend, design, devops, etc.)

FORMATO DE RESPOSTA (JSON ARRAY):
[
  {
    "title": "Título da tarefa",
    "description": "Descrição detalhada",
    "acceptance_criteria": ["critério 1", "critério 2"],
    "estimated_hours": 8,
    "priority": "high",
    "suggested_phase_id": "uuid-da-fase ou null",
    "skills": ["backend", "database"]
  }
]

Gere entre 5-15 tarefas dependendo da complexidade.
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: 'Você é um especialista em decomposição de projetos. Retorne apenas um array JSON válido.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.4,
      response_format: { type: 'json_object' },
    });

    const parsed = JSON.parse(completion.choices[0].message.content || '{"tasks": []}');
    const tasks = parsed.tasks || [];

    // Salvar tarefas geradas
    const { data: savedTasks, error } = await supabase
      .from('ai_generated_tasks')
      .insert(
        tasks.map((task: any) => ({
          project_id: validated.projectId,
          title: task.title,
          description: task.description,
          acceptance_criteria: task.acceptance_criteria,
          estimated_hours: task.estimated_hours,
          priority: task.priority,
          suggested_phase_id: task.suggested_phase_id,
          skills: task.skills,
          raw_ai_response: completion.choices[0].message.content,
          created_by: user.id,
        }))
      )
      .select();

    if (error) throw error;

    revalidatePath(`/projects/${validated.projectId}/tasks`);
    return { success: true, data: savedTasks, count: savedTasks?.length || 0 };
  } catch (error) {
    console.error('Erro ao gerar tarefas:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro ao gerar tarefas' 
    };
  }
}

/**
 * Analisa um repositório GitHub usando IA
 */
export async function analyzeGitHubWithAI(data: z.infer<typeof AnalyzeGitHubSchema>) {
  try {
    const supabase = await createClient();
    const validated = AnalyzeGitHubSchema.parse(data);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autorizado');

    // Extrair owner e repo da URL
    const urlParts = validated.repositoryUrl.split('/');
    const owner = urlParts[urlParts.length - 2];
    const repo = urlParts[urlParts.length - 1].replace('.git', '');

    if (!owner || !repo) {
      throw new Error('URL do repositório inválida');
    }

    const openai = getOpenAIClient();

    // Nota: Em produção, você buscaria dados reais da API do GitHub aqui
    // Por enquanto, vamos simular uma análise baseada em boas práticas
    
    const prompt = `
Você é um arquiteto de software sênior especializado em análise de código.

REPOSITÓRIO: ${owner}/${repo}
BRANCH: ${validated.branch}
FOCO DA ANÁLISE: ${validated.focus}

TAREFA:
Forneça uma análise abrangente cobrindo os seguintes aspectos (conforme o foco selecionado):

${validated.focus === 'all' || validated.focus === 'code_quality' ? `
CÓDIGO:
- Padrões de código e consistência
- Complexidade ciclomática
- Duplicação de código
- Cobertura de testes
` : ''}

${validated.focus === 'all' || validated.focus === 'security' ? `
SEGURANÇA:
- Vulnerabilidades conhecidas
- Gestão de secrets
- Validação de inputs
- Autenticação e autorização
` : ''}

${validated.focus === 'all' || validated.focus === 'performance' ? `
PERFORMANCE:
- Otimizações de queries
- Cache strategy
- Lazy loading
- Bundle size
` : ''}

${validated.focus === 'all' || validated.focus === 'architecture' ? `
ARQUITETURA:
- Organização de pastas
- Separação de responsabilidades
- Escalabilidade
- Manutenibilidade
` : ''}

FORMATO DE RESPOSTA (JSON):
{
  "repository": "${owner}/${repo}",
  "analyzed_at": "${new Date().toISOString()}",
  "focus": "${validated.focus}",
  "overall_score": 0-100,
  "categories": {
    "code_quality": {"score": 0-100, "findings": []},
    "security": {"score": 0-100, "findings": []},
    "performance": {"score": 0-100, "findings": []},
    "architecture": {"score": 0-100, "findings": []}
  },
  "critical_issues": [],
  "recommendations": [],
  "tech_stack_detected": [],
  "next_steps": []
}
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: 'Você é um especialista em análise de repositórios. Retorne JSON válido.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const analysis = JSON.parse(completion.choices[0].message.content || '{}');

    // Salvar análise
    const { data: savedAnalysis, error } = await supabase
      .from('github_ai_analyses')
      .insert({
        repository_owner: owner,
        repository_name: repo,
        branch: validated.branch,
        focus: validated.focus,
        overall_score: analysis.overall_score,
        categories: analysis.categories,
        critical_issues: analysis.critical_issues,
        recommendations: analysis.recommendations,
        tech_stack: analysis.tech_stack_detected,
        raw_analysis: completion.choices[0].message.content,
        analyzed_at: new Date(),
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/github-analysis');
    return { success: true, data: savedAnalysis, analysis };
  } catch (error) {
    console.error('Erro na análise do GitHub:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro na análise' 
    };
  }
}

/**
 * Busca todos os templates de contrato de um workspace
 */
export async function getContractTemplates(workspaceId: string) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('contract_templates')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Erro ao buscar templates:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro ao buscar templates' 
    };
  }
}

/**
 * Busca análises de processo de um projeto
 */
export async function getProcessAnalyses(projectId: string) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('process_analyses')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Erro ao buscar análises:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro ao buscar análises' 
    };
  }
}

/**
 * Busca tarefas geradas por IA de um projeto
 */
export async function getAITasks(projectId: string) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('ai_generated_tasks')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Erro ao buscar tarefas:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro ao buscar tarefas' 
    };
  }
}

/**
 * Converte tarefa gerada por IA em tarefa real
 */
export async function convertAITaskToRealTask(aiTaskId: string, phaseId?: string) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autorizado');

    // Buscar tarefa IA
    const { data: aiTask } = await supabase
      .from('ai_generated_tasks')
      .select('*')
      .eq('id', aiTaskId)
      .single();

    if (!aiTask) throw new Error('Tarefa não encontrada');

    // Criar tarefa real
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        project_id: aiTask.project_id,
        phase_id: phaseId || aiTask.suggested_phase_id,
        title: aiTask.title,
        description: aiTask.description,
        acceptance_criteria: aiTask.acceptance_criteria,
        estimated_hours: aiTask.estimated_hours,
        priority: aiTask.priority,
        status: 'todo',
        created_by: user.id,
      })
      .select()
      .single();

    if (taskError) throw taskError;

    // Atualizar status da tarefa IA
    await supabase
      .from('ai_generated_tasks')
      .update({ status: 'converted', converted_task_id: task.id })
      .eq('id', aiTaskId);

    revalidatePath(`/projects/${aiTask.project_id}/tasks`);
    return { success: true, data: task };
  } catch (error) {
    console.error('Erro ao converter tarefa:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro ao converter' 
    };
  }
}
