/**
 * Proposals and Scope Management Server Actions
 * Handles creation, management, and conversion of project proposals
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Database } from '@/types/database.types';

// Schema validations
export const proposalSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  clientId: z.string().uuid().optional(),
  totalValue: z.number().positive().optional(),
  currency: z.string().default('BRL'),
  validUntil: z.string().datetime().optional(),
  templateData: z.record(z.string(), z.any()).optional(),
  customFields: z.record(z.string(), z.any()).optional(),
});

export const proposalPhaseSchema = z.object({
  phaseNumber: z.number().int().positive(),
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  deliverables: z.array(z.string()).optional(),
  estimatedHours: z.number().nonnegative().optional(),
  startDateOffset: z.number().int().default(0),
  durationDays: z.number().int().nonnegative().default(0),
  value: z.number().nonnegative().optional(),
  milestone: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export const proposalTimelineSchema = z.object({
  eventName: z.string().min(3).max(200),
  eventType: z.enum(['milestone', 'delivery', 'review', 'meeting', 'deadline']),
  scheduledDateOffset: z.number().int(),
  description: z.string().optional(),
  responsibleRole: z.string().optional(),
  sortOrder: z.number().int().default(0),
});

export const proposalResourceSchema = z.object({
  resourceType: z.enum(['developer', 'designer', 'manager', 'tool', 'service', 'other']),
  roleName: z.string().min(3).max(100),
  allocatedHours: z.number().nonnegative().optional(),
  hourlyRate: z.number().nonnegative().optional(),
  totalCost: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});

export const proposalTermSchema = z.object({
  termType: z.enum(['payment', 'legal', 'technical', 'other']),
  title: z.string().min(3).max(200),
  content: z.string().min(10),
  sortOrder: z.number().int().default(0),
});

// Types
export type ProposalInput = z.infer<typeof proposalSchema>;
export type ProposalPhaseInput = z.infer<typeof proposalPhaseSchema>;
export type ProposalTimelineInput = z.infer<typeof proposalTimelineSchema>;
export type ProposalResourceInput = z.infer<typeof proposalResourceSchema>;
export type ProposalTermInput = z.infer<typeof proposalTermSchema>;

/**
 * Create a new proposal
 */
export async function createProposal(input: ProposalInput) {
  try {
    const supabase = await createClient();
    const validated = proposalSchema.parse(input);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Get workspace from user membership
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin', 'manager'])
      .single();

    if (!membership) throw new Error('No permission to create proposals');

    const { data, error } = await supabase
      .from('proposals')
      .insert({
        workspace_id: membership.workspace_id,
        client_id: validated.clientId || null,
        title: validated.title,
        description: validated.description,
        total_value: validated.totalValue || 0,
        currency: validated.currency,
        valid_until: validated.validUntil || null,
        created_by: user.id,
        template_data: validated.templateData || {},
        custom_fields: validated.customFields || {},
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/proposals');
    return { success: true, data };
  } catch (error) {
    console.error('Error creating proposal:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create proposal' };
  }
}

/**
 * Get all proposals for a workspace
 */
export async function getWorkspaceProposals(workspaceId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('proposals')
      .select(`
        *,
        client:clients(id, name),
        creator:auth.users(id, email, full_name),
        converted_project:projects(id, name)
      `)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching proposals:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch proposals' };
  }
}

/**
 * Get a single proposal with all details
 */
export async function getProposalDetails(proposalId: string) {
  try {
    const supabase = await createClient();

    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select(`
        *,
        client:clients(id, name)
      `)
      .eq('id', proposalId)
      .single();

    if (proposalError || !proposal) throw proposalError ?? new Error('Proposal not found');

    const [phases, timeline, resources, terms, documents] = await Promise.all([
      supabase.from('proposal_phases').select('*').eq('proposal_id', proposalId).order('sort_order'),
      supabase.from('proposal_timeline').select('*').eq('proposal_id', proposalId).order('sort_order'),
      supabase.from('proposal_resources').select('*').eq('proposal_id', proposalId),
      supabase.from('proposal_terms').select('*').eq('proposal_id', proposalId).order('sort_order'),
      supabase.from('proposal_documents').select('*').eq('proposal_id', proposalId),
    ]);

    return {
      success: true,
      data: {
        ...proposal,
        phases: phases.data || [],
        timeline: timeline.data || [],
        resources: resources.data || [],
        terms: terms.data || [],
        documents: documents.data || [],
      },
    };
  } catch (error) {
    console.error('Error fetching proposal details:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch proposal details' };
  }
}

/**
 * Add a phase to a proposal
 */
export async function addProposalPhase(proposalId: string, input: ProposalPhaseInput) {
  try {
    const supabase = await createClient();
    const validated = proposalPhaseSchema.parse(input);

    const { data, error } = await supabase
      .from('proposal_phases')
      .insert({
        proposal_id: proposalId,
        phase_number: validated.phaseNumber,
        title: validated.title,
        description: validated.description,
        deliverables: validated.deliverables || [],
        estimated_hours: validated.estimatedHours || 0,
        start_date_offset: validated.startDateOffset,
        duration_days: validated.durationDays,
        value: validated.value || 0,
        milestone: validated.milestone,
        sort_order: validated.sortOrder,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath(`/proposals/${proposalId}`);
    return { success: true, data };
  } catch (error) {
    console.error('Error adding proposal phase:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to add phase' };
  }
}

/**
 * Add timeline event to proposal
 */
export async function addProposalTimelineEvent(proposalId: string, input: ProposalTimelineInput) {
  try {
    const supabase = await createClient();
    const validated = proposalTimelineSchema.parse(input);

    const { data, error } = await supabase
      .from('proposal_timeline')
      .insert({
        proposal_id: proposalId,
        event_name: validated.eventName,
        event_type: validated.eventType,
        scheduled_date_offset: validated.scheduledDateOffset,
        description: validated.description,
        responsible_role: validated.responsibleRole,
        sort_order: validated.sortOrder,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath(`/proposals/${proposalId}`);
    return { success: true, data };
  } catch (error) {
    console.error('Error adding timeline event:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to add timeline event' };
  }
}

/**
 * Add resource to proposal
 */
export async function addProposalResource(proposalId: string, input: ProposalResourceInput) {
  try {
    const supabase = await createClient();
    const validated = proposalResourceSchema.parse(input);

    const { data, error } = await supabase
      .from('proposal_resources')
      .insert({
        proposal_id: proposalId,
        resource_type: validated.resourceType,
        role_name: validated.roleName,
        allocated_hours: validated.allocatedHours || 0,
        hourly_rate: validated.hourlyRate,
        total_cost: validated.totalCost,
        notes: validated.notes,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath(`/proposals/${proposalId}`);
    return { success: true, data };
  } catch (error) {
    console.error('Error adding resource:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to add resource' };
  }
}

/**
 * Add terms to proposal
 */
export async function addProposalTerm(proposalId: string, input: ProposalTermInput) {
  try {
    const supabase = await createClient();
    const validated = proposalTermSchema.parse(input);

    const { data, error } = await supabase
      .from('proposal_terms')
      .insert({
        proposal_id: proposalId,
        term_type: validated.termType,
        title: validated.title,
        content: validated.content,
        sort_order: validated.sortOrder,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath(`/proposals/${proposalId}`);
    return { success: true, data };
  } catch (error) {
    console.error('Error adding term:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to add term' };
  }
}

/**
 * Generate HTML scope document from proposal
 */
export async function generateScopeDocument(proposalId: string) {
  try {
    const supabase = await createClient();
    
    // Get full proposal data
    const result = await getProposalDetails(proposalId);
    if (!result.success || !result.data) throw new Error('Proposal not found');
    
    const proposal = result.data;
    
    // Generate HTML
    const html = generateScopeHTML(proposal);
    
    // Save document
    const { data, error } = await supabase
      .from('proposal_documents')
      .insert({
        proposal_id: proposalId,
        document_name: `Escopo - ${proposal.title}`,
        document_type: 'html',
        generated_html: html,
        is_scope_document: true,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath(`/proposals/${proposalId}`);
    return { success: true, data, html };
  } catch (error) {
    console.error('Error generating scope document:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to generate scope' };
  }
}

/**
 * Helper function to generate HTML scope
 */
function generateScopeHTML(proposal: any): string {
  const acceptanceDate = new Date();
  
  const calculateDate = (offsetDays: number) => {
    const date = new Date(acceptanceDate);
    date.setDate(date.getDate() + offsetDays);
    return date.toLocaleDateString('pt-BR');
  };

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Escopo do Projeto - ${proposal.title}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 900px; margin: 0 auto; padding: 40px 20px; color: #333; }
    h1 { color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 10px; }
    h2 { color: #1e40af; margin-top: 30px; }
    h3 { color: #3b82f6; }
    .header { background: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
    .phase { background: #f9fafb; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #3b82f6; }
    .timeline-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .resource { display: inline-block; background: #dbeafe; padding: 8px 16px; margin: 5px; border-radius: 4px; }
    .term { margin: 15px 0; padding: 15px; background: #fef3c7; border-radius: 4px; }
    .total { font-size: 1.4em; font-weight: bold; color: #16a34a; margin-top: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f3f4f6; font-weight: 600; }
    .footer { margin-top: 50px; padding-top: 20px; border-top: 2px solid #e5e7eb; font-size: 0.9em; color: #6b7280; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${proposal.title}</h1>
    <p><strong>Cliente:</strong> ${proposal.client?.name || 'A definir'}</p>
    <p><strong>Data de Emissão:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
    ${proposal.valid_until ? `<p><strong>Válido até:</strong> ${new Date(proposal.valid_until).toLocaleDateString('pt-BR')}</p>` : ''}
    ${proposal.description ? `<p><strong>Descrição:</strong> ${proposal.description}</p>` : ''}
  </div>

  <h2>📋 Fases do Projeto</h2>
  ${proposal.phases.map((phase: any) => `
    <div class="phase">
      <h3>Fase ${phase.phase_number}: ${phase.title} ${phase.milestone ? '⭐ (Marco Importante)' : ''}</h3>
      ${phase.description ? `<p>${phase.description}</p>` : ''}
      ${phase.deliverables && phase.deliverables.length > 0 ? `
        <p><strong>Entregáveis:</strong></p>
        <ul>
          ${phase.deliverables.map((d: string) => `<li>${d}</li>`).join('')}
        </ul>
      ` : ''}
      <p><strong>Duração:</strong> ${phase.duration_days} dias | <strong>Horas estimadas:</strong> ${phase.estimated_hours}h</p>
      <p><strong>Início:</strong> ${calculateDate(phase.start_date_offset)} | <strong>Término:</strong> ${calculateDate(phase.start_date_offset + phase.duration_days)}</p>
      ${phase.value ? `<p><strong>Valor:</strong> R$ ${phase.value.toFixed(2)}</p>` : ''}
    </div>
  `).join('')}

  <h2>📅 Cronograma</h2>
  <table>
    <thead>
      <tr>
        <th>Evento</th>
        <th>Tipo</th>
        <th>Data Prevista</th>
        <th>Responsável</th>
      </tr>
    </thead>
    <tbody>
      ${proposal.timeline.map((item: any) => `
        <tr>
          <td>${item.event_name}</td>
          <td>${item.event_type.toUpperCase()}</td>
          <td>${calculateDate(item.scheduled_date_offset)}</td>
          <td>${item.responsible_role || '-'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>👥 Equipe e Recursos</h2>
  <div>
    ${proposal.resources.map((resource: any) => `
      <div class="resource">
        <strong>${resource.role_name}</strong> (${resource.resource_type})<br/>
        ${resource.allocated_hours ? `${resource.allocated_hours}h` : ''}
        ${resource.hourly_rate ? ` - R$ ${resource.hourly_rate.toFixed(2)}/h` : ''}
        ${resource.total_cost ? `<br/><strong>Total: R$ ${resource.total_cost.toFixed(2)}</strong>` : ''}
      </div>
    `).join('')}
  </div>

  ${proposal.terms && proposal.terms.length > 0 ? `
    <h2>📜 Termos e Condições</h2>
    ${proposal.terms.map((term: any) => `
      <div class="term">
        <h3>${term.title}</h3>
        <p>${term.content}</p>
      </div>
    `).join('')}
  ` : ''}

  <h2>💰 Investimento Total</h2>
  <p class="total">R$ ${proposal.total_value?.toFixed(2) || '0.00'}</p>

  <div class="footer">
    <p>Este documento foi gerado automaticamente pela plataforma ReobotLabs Portal.</p>
    <p>Para aceitar esta proposta, acesse o portal e clique em "Aceitar Proposta".</p>
    <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Convert proposal to active project
 */
export async function convertProposalToProject(proposalId: string, projectName?: string) {
  try {
    const supabase = await createClient();
    
    // Get proposal details
    const result = await getProposalDetails(proposalId);
    if (!result.success || !result.data) throw new Error('Proposal not found');
    
    const proposal = result.data;
    
    if (proposal.status !== 'accepted') {
      throw new Error('Only accepted proposals can be converted to projects');
    }

    // Start transaction-like operation
    if (!proposal.client_id) {
      throw new Error('Proposal must have a client to be converted');
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        workspace_id: proposal.workspace_id,
        client_id: proposal.client_id,
        name: projectName || proposal.title,
        description: proposal.description,
        type: 'saas',
        status: 'active',
        contract_value: proposal.total_value || 0,
        converted_from_proposal_id: proposalId,
        proposal_accepted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (projectError) throw projectError;

    // Convert phases to project phases/tasks
    const phasePromises = proposal.phases.map(async (phase: any) => {
      return supabase.from('tasks').insert({
        project_id: project.id,
        title: phase.title,
        description: phase.description,
        status: 'todo',
        priority: phase.milestone ? 'high' : 'medium',
        estimated_hours: phase.estimated_hours || 0,
        due_date_offset: phase.start_date_offset + phase.duration_days,
      });
    });

    await Promise.all(phasePromises);

    // Update proposal status
    await supabase
      .from('proposals')
      .update({
        status: 'converted',
        converted_to_project_id: project.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', proposalId);

    revalidatePath('/projects');
    revalidatePath('/proposals');
    
    return { success: true, projectId: project.id, data: project };
  } catch (error) {
    console.error('Error converting proposal to project:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to convert proposal' };
  }
}

/**
 * Update proposal status
 */
export async function updateProposalStatus(proposalId: string, status: string) {
  try {
    const supabase = await createClient();
    
    const validStatuses = ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'converted'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status');
    }

    const { data, error } = await supabase
      .from('proposals')
      .update({ 
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', proposalId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/proposals');
    revalidatePath(`/proposals/${proposalId}`);
    
    return { success: true, data };
  } catch (error) {
    console.error('Error updating proposal status:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update status' };
  }
}

/**
 * Delete proposal
 */
export async function deleteProposal(proposalId: string) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('proposals')
      .delete()
      .eq('id', proposalId);

    if (error) throw error;

    revalidatePath('/proposals');
    return { success: true };
  } catch (error) {
    console.error('Error deleting proposal:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete proposal' };
  }
}

/**
 * Get proposal templates
 */
export async function getProposalTemplates() {
  const commonVariables = [
    { key: 'client_name', label: 'Nome do Cliente', placeholder: 'Ex: Acme LTDA' },
    { key: 'project_name', label: 'Nome do Projeto', placeholder: 'Ex: Portal de Atendimento' },
    { key: 'project_goal', label: 'Objetivo Principal', placeholder: 'Ex: reduzir tempo de resposta em 40%' },
  ];

  const templates = [
    {
      id: 'website-basic',
      name: 'Site Institucional Básico',
      description: 'Template para sites institucionais de pequeno porte',
      titleTemplate: 'Proposta {{project_name}} - {{client_name}}',
      descriptionTemplate:
        'Implementação do projeto {{project_name}} para {{client_name}} com foco em {{project_goal}}.',
      variables: commonVariables,
      defaultPhases: [
        { title: 'Descoberta e Planejamento', duration_days: 5, estimated_hours: 20 },
        { title: 'Design e Prototipagem', duration_days: 10, estimated_hours: 40 },
        { title: 'Desenvolvimento Frontend', duration_days: 15, estimated_hours: 60 },
        { title: 'Revisões e Lançamento', duration_days: 5, estimated_hours: 20 },
      ],
      defaultResources: [
        { role_name: 'Designer UI/UX', resource_type: 'designer', allocated_hours: 40 },
        { role_name: 'Desenvolvedor Frontend', resource_type: 'developer', allocated_hours: 80 },
      ],
    },
    {
      id: 'automation-zapier',
      name: 'Automação com Zapier/n8n',
      description: 'Template para projetos de automação de processos',
      titleTemplate: 'Automação {{project_name}} - {{client_name}}',
      descriptionTemplate:
        'Projeto de automação {{project_name}} para {{client_name}}, orientado a {{project_goal}}.',
      variables: commonVariables,
      defaultPhases: [
        { title: 'Mapeamento de Processos', duration_days: 3, estimated_hours: 15 },
        { title: 'Configuração de Automações', duration_days: 10, estimated_hours: 40 },
        { title: 'Testes e Validação', duration_days: 5, estimated_hours: 20 },
        { title: 'Treinamento e Documentação', duration_days: 2, estimated_hours: 10 },
      ],
      defaultResources: [
        { role_name: 'Especialista em Automação', resource_type: 'developer', allocated_hours: 85 },
      ],
    },
    {
      id: 'ecommerce-complete',
      name: 'E-commerce Completo',
      description: 'Template para lojas virtuais completas',
      titleTemplate: 'E-commerce {{project_name}} - {{client_name}}',
      descriptionTemplate:
        'Construção do e-commerce {{project_name}} para {{client_name}} visando {{project_goal}}.',
      variables: commonVariables,
      defaultPhases: [
        { title: 'Planejamento e Arquitetura', duration_days: 7, estimated_hours: 30 },
        { title: 'Design da Experiência', duration_days: 14, estimated_hours: 60 },
        { title: 'Desenvolvimento Backend', duration_days: 20, estimated_hours: 100 },
        { title: 'Integrações de Pagamento', duration_days: 7, estimated_hours: 30 },
        { title: 'Testes e QA', duration_days: 10, estimated_hours: 40 },
        { title: 'Lançamento e Monitoramento', duration_days: 5, estimated_hours: 20 },
      ],
      defaultResources: [
        { role_name: 'Tech Lead', resource_type: 'developer', allocated_hours: 50 },
        { role_name: 'Designer UI/UX', resource_type: 'designer', allocated_hours: 60 },
        { role_name: 'Desenvolvedor Backend', resource_type: 'developer', allocated_hours: 120 },
        { role_name: 'QA Tester', resource_type: 'other', allocated_hours: 40 },
      ],
    },
  ];
  
  return { success: true, data: templates };
}
