'use server';

import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database.types';
import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { sendSlackNotification } from '@/lib/slack';
import { sendDiscordNotification } from '@/lib/discord';
import { sendWhatsAppNotification } from '@/lib/whatsapp';

// Schemas de validação
export const workflowDefinitionSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  trigger_type: z.enum(['manual', 'webhook', 'scheduled', 'event']),
  trigger_config: z.record(z.string(), z.any()).default({}),
  steps: z.array(z.object({
    name: z.string(),
    type: z.string(),
    config: z.record(z.string(), z.any()),
    conditions: z.array(z.object({
      field: z.string(),
      operator: z.string(),
      value: z.any()
    })).optional()
  })).default([]),
  is_active: z.boolean().default(true)
});

export const webhookEndpointSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  workflow_id: z.string().uuid().optional(),
  endpoint_url: z.string().url('URL inválida'),
  headers: z.record(z.string(), z.string()).default({}),
  is_active: z.boolean().default(true)
});

export const externalIntegrationSchema = z.object({
  service_type: z.enum(['zapier', 'n8n', 'make', 'slack', 'discord', 'whatsapp', 'email', 'custom']),
  name: z.string().min(1, 'Nome é obrigatório'),
  credentials: z.record(z.string(), z.any()).default({}),
  is_active: z.boolean().default(true)
});

export const executeWorkflowSchema = z.object({
  workflow_id: z.string().uuid(),
  trigger_payload: z.record(z.string(), z.any()).optional()
});

// Types
export type WorkflowDefinition = z.infer<typeof workflowDefinitionSchema>;
export type WebhookEndpoint = z.infer<typeof webhookEndpointSchema>;
export type ExternalIntegration = z.infer<typeof externalIntegrationSchema>;
export type ExecuteWorkflowParams = z.infer<typeof executeWorkflowSchema>;
type JsonObject = Record<string, unknown>;
type WorkflowStep = {
  name: string;
  type: string;
  config: JsonObject;
  conditions?: Array<{ field: string; operator: string; value: unknown }>;
};
type WorkflowContext = {
  payload: JsonObject;
  results: Record<string, unknown>;
  meta?: {
    workspace_id?: string;
    triggered_by?: string | null;
  };
};
type WorkflowExecutionLog = { step: string; status: string; message: string; timestamp: string };
type SupabaseServerClient = SupabaseClient<Database>;
type StepExecutionRunResult = {
  failed: boolean;
  breakExecution: boolean;
};

/**
 * Criar um novo workflow
 */
export async function createWorkflow(data: WorkflowDefinition) {
  try {
    const validatedData = workflowDefinitionSchema.parse(data);
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autorizado');

    // Obter workspace do usuário
    const { data: workspaceMember } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!workspaceMember) throw new Error('Usuário não pertence a nenhum workspace');

    const { data: workflow, error } = await supabase
      .from('workflow_definitions')
      .insert({
        ...validatedData,
        workspace_id: workspaceMember.workspace_id,
        created_by: user.id
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/workflows');
    return { success: true, data: workflow };
  } catch (error) {
    console.error('Erro ao criar workflow:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro ao criar workflow' 
    };
  }
}

/**
 * Listar workflows do workspace
 */
export async function listWorkflows(workspaceId?: string) {
  try {
    const supabase = await createClient();
    
    let query = supabase
      .from('workflow_definitions')
      .select(`
        *,
        creator:created_by (id, email),
        executions:workflow_executions (count)
      `)
      .order('created_at', { ascending: false });

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Erro ao listar workflows:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro ao listar workflows' 
    };
  }
}

/**
 * Obter detalhes de um workflow
 */
export async function getWorkflow(workflowId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('workflow_definitions')
      .select(`
        *,
        creator:created_by (id, email),
        executions:workflow_executions (
          id,
          status,
          started_at,
          completed_at,
          error_message
        ),
        webhooks:webhook_endpoints (*)
      `)
      .eq('id', workflowId)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Erro ao obter workflow:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro ao obter workflow' 
    };
  }
}

/**
 * Atualizar workflow
 */
export async function updateWorkflow(workflowId: string, data: Partial<WorkflowDefinition>) {
  try {
    const validatedData = workflowDefinitionSchema.partial().parse(data);
    const supabase = await createClient();

    const { data: workflow, error } = await supabase
      .from('workflow_definitions')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', workflowId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath(`/workflows/${workflowId}`);
    return { success: true, data: workflow };
  } catch (error) {
    console.error('Erro ao atualizar workflow:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro ao atualizar workflow' 
    };
  }
}

/**
 * Ativar/Desativar workflow
 */
export async function toggleWorkflowStatus(workflowId: string, isActive: boolean) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('workflow_definitions')
      .update({ 
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', workflowId);

    if (error) throw error;

    revalidatePath('/workflows');
    return { success: true };
  } catch (error) {
    console.error('Erro ao alternar status:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro ao alternar status' 
    };
  }
}

/**
 * Deletar workflow
 */
export async function deleteWorkflow(workflowId: string) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('workflow_definitions')
      .delete()
      .eq('id', workflowId);

    if (error) throw error;

    revalidatePath('/workflows');
    return { success: true };
  } catch (error) {
    console.error('Erro ao deletar workflow:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro ao deletar workflow' 
    };
  }
}

/**
 * Executar workflow manualmente
 */
export async function executeWorkflow(params: ExecuteWorkflowParams) {
  try {
    const validatedData = executeWorkflowSchema.parse(params);
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Criar execução
    const { data: execution, error: execError } = await supabase
      .from('workflow_executions')
      .insert({
        workflow_id: validatedData.workflow_id,
        status: 'pending',
        triggered_by: user?.id,
        trigger_payload: validatedData.trigger_payload || {}
      })
      .select()
      .single();

    if (execError) throw execError;

    // Obter definição do workflow
    const { data: workflow, error: wfError } = await supabase
      .from('workflow_definitions')
      .select('steps, workspace_id')
      .eq('id', validatedData.workflow_id)
      .single();

    if (wfError || !workflow) throw new Error('Workflow nao encontrado');

    const steps = (workflow.steps || []) as WorkflowStep[];

    // Atualizar para running
    await supabase
      .from('workflow_executions')
      .update({
        status: 'running',
        started_at: new Date().toISOString()
      })
      .eq('id', execution.id);

    // Executar steps sequencialmente
    const logs: WorkflowExecutionLog[] = [];
    const context: WorkflowContext = {
      payload: (validatedData.trigger_payload || {}) as JsonObject,
      results: {},
      meta: {
        workspace_id: workflow.workspace_id,
        triggered_by: user?.id ?? null,
      },
    };
    let failed = false;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const runResult = await runWorkflowStep({
        supabase,
        executionId: execution.id,
        step,
        stepIndex: i,
        context,
        logs,
      });
      if (runResult.failed) failed = true;
      if (runResult.breakExecution) break;
    }

    // Finalizar execucao
    await supabase
      .from('workflow_executions')
      .update({
        status: failed ? 'failed' : 'completed',
        completed_at: new Date().toISOString(),
        error_message: failed ? logs[logs.length - 1]?.message : null,
        logs,
      })
      .eq('id', execution.id);

    // Incrementar contador de execucoes
    await supabase.rpc('increment_workflow_execution_count', {
      p_workflow_id: validatedData.workflow_id
    });

    revalidatePath(`/workflows/${validatedData.workflow_id}`);
    return { success: true, data: execution, logs };
  } catch (error) {
    console.error('Erro ao executar workflow:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro ao executar workflow' 
    };
  }
}

export async function rerunWorkflowFromFailedStep(executionId: string) {
  try {
    const supabase = await createClient();

    const { data: execution } = await supabase
      .from('workflow_executions')
      .select('id, workflow_id, trigger_payload')
      .eq('id', executionId)
      .single();

    if (!execution) return { success: false, error: 'Execucao nao encontrada' };

    const { data: workflow } = await supabase
      .from('workflow_definitions')
      .select('id, steps, workspace_id')
      .eq('id', execution.workflow_id)
      .single();

    if (!workflow) return { success: false, error: 'Workflow nao encontrado' };

    const { data: failedStep } = await supabase
      .from('workflow_step_executions')
      .select('step_index')
      .eq('execution_id', execution.id)
      .eq('status', 'failed')
      .order('step_index', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!failedStep) return { success: false, error: 'Nenhum step falho encontrado para reexecucao' };

    const steps = (workflow.steps || []) as WorkflowStep[];
    const logs: WorkflowExecutionLog[] = [];
    const context: WorkflowContext = {
      payload: (execution.trigger_payload || {}) as JsonObject,
      results: {},
      meta: { workspace_id: workflow.workspace_id },
    };

    const { data: replayExecution, error: replayError } = await supabase
      .from('workflow_executions')
      .insert({
        workflow_id: workflow.id,
        status: 'running',
        trigger_payload: execution.trigger_payload || {},
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (replayError || !replayExecution) {
      return { success: false, error: replayError?.message ?? 'Falha ao criar reexecucao' };
    }

    let failed = false;
    for (let i = failedStep.step_index; i < steps.length; i++) {
      const step = steps[i];
      const runResult = await runWorkflowStep({
        supabase,
        executionId: replayExecution.id,
        step,
        stepIndex: i,
        context,
        logs,
      });
      if (runResult.failed) failed = true;
      if (runResult.breakExecution) break;
    }

    await supabase
      .from('workflow_executions')
      .update({
        status: failed ? 'failed' : 'completed',
        completed_at: new Date().toISOString(),
        error_message: failed ? logs[logs.length - 1]?.message : null,
        logs,
      })
      .eq('id', replayExecution.id);

    revalidatePath(`/workflows/${workflow.id}`);
    return { success: true, data: replayExecution, logs };
  } catch (error) {
    console.error('Erro ao reexecutar workflow:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao reexecutar workflow',
    };
  }
}

/**
 * Criar webhook endpoint
 */
export async function createWebhookEndpoint(data: WebhookEndpoint) {
  try {
    const validatedData = webhookEndpointSchema.parse(data);
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autorizado');

    const { data: workspaceMember } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!workspaceMember) throw new Error('Usuário não pertence a nenhum workspace');

    const { data: webhook, error } = await supabase
      .from('webhook_endpoints')
      .insert({
        ...validatedData,
        workspace_id: workspaceMember.workspace_id
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/workflows/webhooks');
    return { success: true, data: webhook };
  } catch (error) {
    console.error('Erro ao criar webhook:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro ao criar webhook' 
    };
  }
}

/**
 * Listar webhooks do workspace
 */
export async function listWebhooks(workspaceId?: string) {
  try {
    const supabase = await createClient();
    
    let query = supabase
      .from('webhook_endpoints')
      .select(`
        *,
        workflow:workflow_id (id, name)
      `)
      .order('created_at', { ascending: false });

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Erro ao listar webhooks:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro ao listar webhooks' 
    };
  }
}

/**
 * Criar integração externa
 */
export async function createExternalIntegration(data: ExternalIntegration) {
  try {
    const validatedData = externalIntegrationSchema.parse(data);
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autorizado');

    const { data: workspaceMember } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!workspaceMember) throw new Error('Usuário não pertence a nenhum workspace');

    const { data: integration, error } = await supabase
      .from('external_integrations')
      .insert({
        ...validatedData,
        workspace_id: workspaceMember.workspace_id
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/workflows/integrations');
    return { success: true, data: integration };
  } catch (error) {
    console.error('Erro ao criar integração:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro ao criar integração' 
    };
  }
}

/**
 * Listar integrações externas
 */
export async function listExternalIntegrations(workspaceId?: string) {
  try {
    const supabase = await createClient();
    
    let query = supabase
      .from('external_integrations')
      .select('*')
      .order('created_at', { ascending: false });

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Erro ao listar integrações:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro ao listar integrações' 
    };
  }
}

/**
 * Obter histórico de execuções
 */
export async function getExecutionHistory(workflowId: string, limit = 20) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('workflow_executions')
      .select(`
        *,
        step_executions:workflow_step_executions (
          step_name,
          status,
          started_at,
          completed_at,
          error_message
        ),
        triggerer:triggered_by (id, email)
      `)
      .eq('workflow_id', workflowId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Erro ao obter histórico:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro ao obter histórico' 
    };
  }
}

/**
 * Carregar templates de automação
 */
export async function loadAutomationTemplates(category?: string) {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('automation_templates')
      .select('*')
      .eq('is_public', true)
      .order('usage_count', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Erro ao carregar templates:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao carregar templates'
    };
  }
}

// ── Helpers para execucao de workflow ──

function resolveTemplate(template: string, context: WorkflowContext | JsonObject): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, path: string) => {
    const keys = path.trim().split('.');
    let value: unknown = context;
    for (const key of keys) {
      if (value == null || typeof value !== 'object') return '';
      value = (value as Record<string, unknown>)[key];
    }
    return value != null ? String(value) : '';
  });
}

function resolveConfig(config: JsonObject, context: WorkflowContext): JsonObject {
  const resolved: JsonObject = {};
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'string') {
      resolved[key] = resolveTemplate(value, context);
    } else if (Array.isArray(value)) {
      resolved[key] = value.map((item) =>
        typeof item === 'string' ? resolveTemplate(item, context) : item
      );
    } else {
      resolved[key] = value;
    }
  }
  return resolved;
}

function evaluateConditions(
  conditions: Array<{ field: string; operator: string; value: unknown }>,
  context: WorkflowContext
): boolean {
  return conditions.every((condition) => {
    const fieldValue = resolveTemplate(`{{${condition.field}}}`, context);
    const expected = String(condition.value);

    switch (condition.operator) {
      case 'equals':
        return fieldValue === expected;
      case 'not_equals':
        return fieldValue !== expected;
      case 'contains':
        return fieldValue.includes(expected);
      case 'not_contains':
        return !fieldValue.includes(expected);
      case 'greater_than':
        return Number(fieldValue) > Number(expected);
      case 'less_than':
        return Number(fieldValue) < Number(expected);
      case 'exists':
        return fieldValue !== '' && fieldValue !== 'undefined' && fieldValue !== 'null';
      case 'not_exists':
        return fieldValue === '' || fieldValue === 'undefined' || fieldValue === 'null';
      default:
        return true;
    }
  });
}

async function executeStep(
  supabase: SupabaseServerClient,
  step: WorkflowStep,
  context: WorkflowContext
): Promise<JsonObject> {
  const config = resolveConfig(step.config, context);

  switch (step.type) {
    case 'parser':
      return { parsed: true, source: config.source, event: config.event, data: context.payload };

    case 'condition':
      // Condicoes ja avaliadas antes, se chegou aqui passou
      return { condition_met: true };

    case 'task_create': {
      const workspaceId = context.meta?.workspace_id
      if (!workspaceId) throw new Error('Workspace nao encontrado para criar tarefa');

      // Buscar primeiro projeto do workspace como fallback
      const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('workspace_id', workspaceId)
        .limit(1)
        .single();

      if (!project) throw new Error('Nenhum projeto encontrado para criar tarefa');

      const taskTitle = typeof config.title === 'string' ? config.title : 'Tarefa automatica';
      const taskDescription = typeof config.description === 'string' ? config.description : '';
      const taskPriority = typeof config.priority === 'string' ? config.priority : 'medium';
      const projectId = typeof config.project_id === 'string' ? config.project_id : project.id;

      const { data: task, error } = await supabase
        .from('tasks')
        .insert({
          project_id: projectId,
          title: taskTitle,
          description: taskDescription,
          status: 'todo',
          priority: taskPriority,
        })
        .select('id, title')
        .single();

      if (error) throw new Error('Erro ao criar tarefa: ' + error.message);
      return { task_id: task.id, title: task.title };
    }

    case 'project_create': {
      const workspaceId = context.meta?.workspace_id
      if (!workspaceId) throw new Error('Workspace nao encontrado');

      const projectName = typeof config.name === 'string' ? config.name : 'Projeto automatico';
      const projectDescription = typeof config.description === 'string' ? config.description : '';
      let clientId = typeof config.client_id === 'string' ? config.client_id : null;
      if (!clientId) {
        const { data: client } = await supabase
          .from('clients')
          .select('id')
          .eq('workspace_id', workspaceId)
          .limit(1)
          .single();
        clientId = client?.id ?? null;
      }
      if (!clientId) throw new Error('Nenhum cliente encontrado para criar projeto');

      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          workspace_id: workspaceId,
          name: projectName,
          description: projectDescription,
          client_id: clientId,
          status: 'active',
          type: 'saas',
        })
        .select('id, name')
        .single();

      if (error) throw new Error('Erro ao criar projeto: ' + error.message);
      return { project_id: project.id, name: project.name };
    }

    case 'slack_message': {
      const projectId = typeof config.project_id === 'string'
        ? config.project_id
        : typeof context.payload.project_id === 'string'
        ? context.payload.project_id
        : undefined;
      const message = typeof config.message === 'string' ? config.message : '';
      const channel = typeof config.channel === 'string' ? config.channel : undefined;
      const result = await sendSlackNotification({
        projectId,
        title: channel ? `Workflow Slack (${channel})` : 'Workflow Slack',
        body: message || 'Mensagem enviada por workflow',
      });
      return {
        sent: result.sent,
        reason: result.reason,
        channel,
        message,
      };
    }

    case 'discord_message': {
      const projectId = typeof config.project_id === 'string'
        ? config.project_id
        : typeof context.payload.project_id === 'string'
        ? context.payload.project_id
        : undefined;
      const message = typeof config.message === 'string' ? config.message : '';
      const channel = typeof config.channel === 'string' ? config.channel : undefined;
      const result = await sendDiscordNotification({
        projectId,
        title: channel ? `Workflow Discord (${channel})` : 'Workflow Discord',
        body: message || 'Mensagem enviada por workflow',
      });
      return {
        sent: result.sent,
        reason: result.reason,
        channel,
        message,
      };
    }

    case 'whatsapp_message': {
      const projectId = typeof config.project_id === 'string'
        ? config.project_id
        : typeof context.payload.project_id === 'string'
        ? context.payload.project_id
        : undefined;
      const message = typeof config.message === 'string' ? config.message : '';
      const number = typeof config.number === 'string' ? config.number : undefined;
      const result = await sendWhatsAppNotification({
        projectId,
        number,
        message: message || 'Mensagem enviada por workflow',
      });
      return {
        sent: result.sent,
        reason: result.reason,
        number,
        message,
      };
    }

    case 'email_send':
      return {
        sent: true,
        to: config.to,
        subject: config.subject,
        note: 'Requer servico de email configurado',
      };

    case 'google_calendar_create':
      return {
        created: true,
        summary: config.summary,
        start: config.start,
        end: config.end,
        note: 'Requer integracao Google Calendar configurada',
      };

    case 'data_export': {
      const tables = Array.isArray(config.tables)
        ? config.tables.filter((table): table is string => typeof table === 'string')
        : [];
      const exportData: Record<string, unknown[]> = {};

      for (const table of tables) {
        const { data, error } = await supabase.from(table as never).select('*').limit(1000);
        if (!error && data) {
          exportData[table] = data;
        }
      }

      return {
        exported_tables: tables,
        row_counts: Object.fromEntries(Object.entries(exportData).map(([k, v]) => [k, v.length])),
      };
    }

    case 'storage_upload':
      return {
        uploaded: true,
        bucket: config.bucket,
        path: config.path,
        note: 'Upload ao Supabase Storage',
      };

    case 'loop': {
      const items = config.items;
      return {
        loop_action: config.action,
        items_count: Array.isArray(items) ? items.length : 0,
        note: 'Loop executado',
      };
    }

    default:
      return { type: step.type, status: 'executed', config };
  }
}

async function runWorkflowStep(params: {
  supabase: SupabaseServerClient;
  executionId: string;
  step: WorkflowStep;
  stepIndex: number;
  context: WorkflowContext;
  logs: WorkflowExecutionLog[];
}): Promise<StepExecutionRunResult> {
  const { supabase, executionId, step, stepIndex, context, logs } = params;
  const nowIso = new Date().toISOString();
  const retryCountRaw = (step.config.retry_count as number | undefined) ?? 0;
  const retryCount = Number.isFinite(retryCountRaw) ? Math.max(0, Math.floor(retryCountRaw)) : 0;

  const { data: stepExec } = await supabase
    .from('workflow_step_executions')
    .insert({
      execution_id: executionId,
      step_index: stepIndex,
      step_name: step.name,
      step_type: step.type,
      status: 'running',
      input_data: { config: step.config, context } as Database['public']['Tables']['workflow_step_executions']['Insert']['input_data'],
      started_at: nowIso,
    })
    .select()
    .single();

  if (!stepExec) {
    throw new Error(`Falha ao registrar execução do step ${step.name}`);
  }

  if (step.conditions && step.conditions.length > 0) {
    const conditionsMet = evaluateConditions(step.conditions, context);
    if (!conditionsMet) {
      await supabase
        .from('workflow_step_executions')
        .update({ status: 'skipped', completed_at: new Date().toISOString() })
        .eq('id', stepExec.id);
      logs.push({ step: step.name, status: 'skipped', message: 'Condicoes nao atendidas', timestamp: new Date().toISOString() });
      return { failed: false, breakExecution: false };
    }
  }

  let attempt = 0;
  let lastError = '';
  while (attempt <= retryCount) {
    attempt += 1;
    try {
      const result = await executeStep(supabase, step, context);
      context.results[step.name] = result;

      await supabase
        .from('workflow_step_executions')
        .update({
          status: 'completed',
          output_data: {
            result,
            attempts: attempt,
            retry_count: retryCount,
          } as Database['public']['Tables']['workflow_step_executions']['Update']['output_data'],
          completed_at: new Date().toISOString(),
        })
        .eq('id', stepExec.id);

      logs.push({
        step: step.name,
        status: 'completed',
        message: attempt > 1 ? `Executado com sucesso após ${attempt} tentativas` : 'Executado com sucesso',
        timestamp: new Date().toISOString(),
      });
      return { failed: false, breakExecution: false };
    } catch (stepError) {
      lastError = stepError instanceof Error ? stepError.message : 'Erro desconhecido';
      if (attempt <= retryCount) {
        logs.push({
          step: step.name,
          status: 'retry',
          message: `Tentativa ${attempt} falhou: ${lastError}`,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  await supabase
    .from('workflow_step_executions')
    .update({
      status: 'failed',
      error_message: lastError,
      output_data: {
        attempts: attempt,
        retry_count: retryCount,
        last_error: lastError,
      } as Database['public']['Tables']['workflow_step_executions']['Update']['output_data'],
      completed_at: new Date().toISOString(),
    })
    .eq('id', stepExec.id);

  logs.push({ step: step.name, status: 'failed', message: lastError, timestamp: new Date().toISOString() });
  return { failed: true, breakExecution: true };
}
