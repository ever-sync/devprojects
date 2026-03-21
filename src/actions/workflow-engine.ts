'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// Schemas de validação
export const workflowDefinitionSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  trigger_type: z.enum(['manual', 'webhook', 'scheduled', 'event']),
  trigger_config: z.record(z.any()).default({}),
  steps: z.array(z.object({
    name: z.string(),
    type: z.string(),
    config: z.record(z.any()),
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
  headers: z.record(z.string()).default({}),
  is_active: z.boolean().default(true)
});

export const externalIntegrationSchema = z.object({
  service_type: z.enum(['zapier', 'n8n', 'make', 'slack', 'discord', 'email', 'custom']),
  name: z.string().min(1, 'Nome é obrigatório'),
  credentials: z.record(z.any()).default({}),
  is_active: z.boolean().default(true)
});

export const executeWorkflowSchema = z.object({
  workflow_id: z.string().uuid(),
  trigger_payload: z.record(z.any()).optional()
});

// Types
export type WorkflowDefinition = z.infer<typeof workflowDefinitionSchema>;
export type WebhookEndpoint = z.infer<typeof webhookEndpointSchema>;
export type ExternalIntegration = z.infer<typeof externalIntegrationSchema>;
export type ExecuteWorkflowParams = z.infer<typeof executeWorkflowSchema>;

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
        creator:user_id (id, email),
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
        creator:user_id (id, email),
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

    // Criar execução
    const { data: execution, error: execError } = await supabase
      .from('workflow_executions')
      .insert({
        workflow_id: validatedData.workflow_id,
        status: 'pending',
        triggered_by: (await supabase.auth.getUser()).data.user?.id,
        trigger_payload: validatedData.trigger_payload || {}
      })
      .select()
      .single();

    if (execError) throw execError;

    // Atualizar para running
    await supabase
      .from('workflow_executions')
      .update({ 
        status: 'running',
        started_at: new Date().toISOString()
      })
      .eq('id', execution.id);

    // TODO: Implementar lógica de execução dos steps
    // Por enquanto, apenas marca como completed
    await supabase
      .from('workflow_executions')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', execution.id);

    // Incrementar contador de execuções
    await supabase.rpc('increment_workflow_execution_count', {
      p_workflow_id: validatedData.workflow_id
    });

    revalidatePath(`/workflows/${validatedData.workflow_id}`);
    return { success: true, data: execution };
  } catch (error) {
    console.error('Erro ao executar workflow:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro ao executar workflow' 
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
