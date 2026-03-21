'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// Schemas de validação
const proposalSchema = z.object({
  title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres'),
  description: z.string().optional(),
  clientName: z.string().min(2, 'Nome do cliente é obrigatório'),
  clientEmail: z.string().email('Email inválido').optional(),
  totalValue: z.number().positive().optional(),
  currency: z.string().default('BRL'),
  validUntil: z.string().optional(),
  projectId: z.string().uuid().optional(),
});

const phaseSchema = z.object({
  phaseNumber: z.number().int().positive(),
  title: z.string().min(3),
  description: z.string().optional(),
  deliverables: z.array(z.string()).default([]),
  estimatedHours: z.number().int().nonnegative().default(0),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  value: z.number().nonnegative().default(0),
  percentageOfTotal: z.number().min(0).max(100).optional(),
  dependencies: z.array(z.number()).default([]),
  sortOrder: z.number().int().default(0),
});

const itemSchema = z.object({
  category: z.string().min(2),
  title: z.string().min(2),
  description: z.string().optional(),
  quantity: z.number().int().positive().default(1),
  unitPrice: z.number().nonnegative().default(0),
  totalPrice: z.number().nonnegative().default(0),
  isOptional: z.boolean().default(false),
  included: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

const termSchema = z.object({
  title: z.string().min(2),
  content: z.string().min(10),
  sortOrder: z.number().int().default(0),
});

export type CreateProposalInput = z.infer<typeof proposalSchema>;
export type UpdateProposalInput = Partial<CreateProposalInput> & { id: string };
export type CreatePhaseInput = z.infer<typeof phaseSchema>;
export type CreateItemInput = z.infer<typeof itemSchema>;
export type CreateTermInput = z.infer<typeof termSchema>;

/**
 * Criar nova proposta/escopo
 */
export async function createProposal(input: CreateProposalInput) {
  const supabase = await createClient();
  
  const validated = proposalSchema.parse(input);
  
  // Obter workspace do usuário
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autorizado');

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  if (!membership || !['owner', 'admin', 'manager'].includes(membership.role)) {
    throw new Error('Permissão negada');
  }

  const publicShareToken = uuidv4();

  const { data, error } = await supabase
    .from('project_proposals')
    .insert({
      workspace_id: membership.workspace_id,
      project_id: validated.projectId,
      title: validated.title,
      description: validated.description,
      client_name: validated.clientName,
      client_email: validated.clientEmail,
      total_value: validated.totalValue || 0,
      currency: validated.currency,
      valid_until: validated.validUntil,
      created_by: user.id,
      public_share_token: publicShareToken,
      status: 'draft',
    })
    .select()
    .single();

  if (error) throw error;

  revalidatePath('/dashboard/proposals');
  return data;
}

/**
 * Atualizar proposta
 */
export async function updateProposal(input: UpdateProposalInput) {
  const supabase = await createClient();
  const { id, ...updates } = input;
  
  const validated = proposalSchema.partial().parse(updates);
  
  const { data, error } = await supabase
    .from('project_proposals')
    .update({
      ...validated,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  revalidatePath(`/dashboard/proposals/${id}`);
  return data;
}

/**
 * Enviar proposta para cliente
 */
export async function sendProposal(proposalId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('project_proposals')
    .update({ 
      status: 'sent',
      sent_at: new Date().toISOString()
    })
    .eq('id', proposalId)
    .select()
    .single();

  if (error) throw error;

  // TODO: Enviar email para o cliente com link público

  revalidatePath(`/dashboard/proposals/${proposalId}`);
  return data;
}

/**
 * Aprovar proposta (pelo cliente ou internamente)
 */
export async function approveProposal(proposalId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('project_proposals')
    .update({ 
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: user?.id,
    })
    .eq('id', proposalId)
    .select()
    .single();

  if (error) throw error;

  revalidatePath(`/dashboard/proposals/${proposalId}`);
  return data;
}

/**
 * Adicionar fase à proposta
 */
export async function addPhase(proposalId: string, input: CreatePhaseInput) {
  const supabase = await createClient();
  
  const validated = phaseSchema.parse(input);

  const { data, error } = await supabase
    .from('proposal_phases')
    .insert({
      proposal_id: proposalId,
      ...validated,
    })
    .select()
    .single();

  if (error) throw error;

  revalidatePath(`/dashboard/proposals/${proposalId}`);
  return data;
}

/**
 * Adicionar item à proposta
 */
export async function addItem(proposalId: string, input: CreateItemInput) {
  const supabase = await createClient();
  
  const validated = itemSchema.parse(input);

  const { data, error } = await supabase
    .from('proposal_items')
    .insert({
      proposal_id: proposalId,
      ...validated,
    })
    .select()
    .single();

  if (error) throw error;

  revalidatePath(`/dashboard/proposals/${proposalId}`);
  return data;
}

/**
 * Adicionar termo/condição à proposta
 */
export async function addTerm(proposalId: string, input: CreateTermInput) {
  const supabase = await createClient();
  
  const validated = termSchema.parse(input);

  const { data, error } = await supabase
    .from('proposal_terms')
    .insert({
      proposal_id: proposalId,
      ...validated,
    })
    .select()
    .single();

  if (error) throw error;

  revalidatePath(`/dashboard/proposals/${proposalId}`);
  return data;
}

/**
 * Obter proposta completa com fases, itens e termos
 */
export async function getProposalDetails(proposalId: string) {
  const supabase = await createClient();

  const { data: proposal, error } = await supabase
    .from('project_proposals')
    .select(`
      *,
      phases:proposal_phases(*),
      items:proposal_items(*),
      terms:proposal_terms(*),
      versions:proposal_versions(*)
    `)
    .eq('id', proposalId)
    .single();

  if (error) throw error;
  return proposal;
}

/**
 * Listar propostas do workspace
 */
export async function listProposals(workspaceId: string, filters?: { status?: string }) {
  const supabase = await createClient();

  let query = supabase
    .from('project_proposals')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * Converter proposta em projeto
 */
export async function convertProposalToProject(proposalId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Obter dados da proposta
  const { data: proposal } = await supabase
    .from('project_proposals')
    .select('*, phases:proposal_phases(*)')
    .eq('id', proposalId)
    .single();

  if (!proposal) throw new Error('Proposta não encontrada');

  // Criar projeto a partir da proposta
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      workspace_id: proposal.workspace_id,
      title: proposal.title,
      description: proposal.description,
      client_id: null, // Pode ser vinculado depois
      status: 'planning',
      budget: proposal.total_value,
      start_date: proposal.phases?.[0]?.start_date,
      end_date: proposal.phases?.[proposal.phases.length - 1]?.end_date,
      created_by: user?.id,
    })
    .select()
    .single();

  if (projectError) throw projectError;

  // Criar fases do projeto baseadas nas fases da proposta
  if (proposal.phases && proposal.phases.length > 0) {
    const phasesToInsert = proposal.phases.map((phase: any) => ({
      project_id: project.id,
      title: phase.title,
      description: phase.description,
      start_date: phase.start_date,
      end_date: phase.end_date,
      status: 'pending',
      sort_order: phase.sort_order,
    }));

    await supabase.from('project_phases').insert(phasesToInsert);
  }

  // Atualizar status da proposta
  await supabase
    .from('project_proposals')
    .update({ 
      status: 'converted',
      project_id: project.id
    })
    .eq('id', proposalId);

  revalidatePath('/dashboard/projects');
  revalidatePath(`/dashboard/proposals/${proposalId}`);
  
  return project;
}

/**
 * Gerar token de compartilhamento público
 */
export async function generatePublicShareToken(proposalId: string) {
  const supabase = await createClient();
  const newToken = uuidv4();

  const { data, error } = await supabase
    .from('project_proposals')
    .update({ public_share_token: newToken })
    .eq('id', proposalId)
    .select('public_share_token')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Obter proposta via token público (para clientes)
 */
export async function getProposalByToken(token: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('project_proposals')
    .select(`
      *,
      phases:proposal_phases(*),
      items:proposal_items(*),
      terms:proposal_terms(*)
    `)
    .eq('public_share_token', token)
    .single();

  if (error) throw error;
  
  // Registrar visualização
  await supabase
    .from('project_proposals')
    .update({ status: 'viewed' })
    .eq('public_share_token', token)
    .eq('status', 'sent');

  return data;
}
