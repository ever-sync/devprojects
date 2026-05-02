'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Schema para template de contrato
const contractTemplateSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  templateType: z.enum(['service_agreement', 'proposal', 'sow', 'nda']),
  contentHtml: z.string(),
  contentMarkdown: z.string().optional(),
  variablesSchema: z.record(z.string(), z.any()).optional(),
  isDefault: z.boolean().optional(),
})

// Schema para contrato
const contractSchema = z.object({
  projectId: z.string().uuid(),
  templateId: z.string().uuid().optional(),
  title: z.string().min(2).max(300),
  contractNumber: z.string().max(50).optional(),
  clientName: z.string().min(2).max(200),
  clientEmail: z.string().email().optional(),
  clientCnpj: z.string().max(20).optional(),
  companyName: z.string().min(2).max(200),
  companyCnpj: z.string().max(20).optional(),
  contractValue: z.number().positive().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  autoRenewal: z.boolean().optional(),
  renewalPeriodDays: z.number().int().positive().optional(),
  paymentTerms: z.string().optional(),
  scopeSummary: z.string().optional(),
  variablesData: z.record(z.string(), z.any()).optional(),
})

/**
 * Cria um novo template de contrato
 */
export async function createContractTemplate(data: z.infer<typeof contractTemplateSchema>) {
  const supabase = await createClient()
  const db = supabase as any
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Não autenticado' }
  }

  const parsed = contractTemplateSchema.safeParse(data)
  if (!parsed.success) {
    return { error: 'Dados inválidos', details: parsed.error.issues }
  }

  // Verificar permissão de admin
  const { data: membership } = await db
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', data.workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return { error: 'Permissão negada. Apenas admins podem criar templates.' }
  }

  // Se for default, remover default dos outros templates
  if (data.isDefault) {
    await db
    .from('contract_templates')
      .update({ is_default: false })
      .eq('workspace_id', data.workspaceId)
      .eq('template_type', data.templateType)
  }

  const { data: template, error } = await db
    .from('contract_templates')
    .insert({
      workspace_id: data.workspaceId,
      name: data.name,
      description: data.description,
      template_type: data.templateType,
      content_html: data.contentHtml,
      content_markdown: data.contentMarkdown,
      variables_schema: data.variablesSchema ?? {},
      is_default: data.isDefault ?? false,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/settings/contracts')
  revalidatePath('/settings/templates')
  return { success: true, template }
}

/**
 * Atualiza um template de contrato
 */
export async function updateContractTemplate(
  templateId: string,
  data: Partial<{
    name: string
    description: string
    contentHtml: string
    contentMarkdown: string
    variablesSchema: Record<string, any>
    isDefault: boolean
    isActive: boolean
  }>
) {
  const supabase = await createClient()
  const db = supabase as any
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Não autenticado' }
  }

  // Obter template atual
  const { data: current } = await db
    .from('contract_templates')
    .select('workspace_id, template_type')
    .eq('id', templateId)
    .single()

  if (!current) {
    return { error: 'Template não encontrado' }
  }

  // Verificar permissão
  const { data: membership } = await db
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', current.workspace_id)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return { error: 'Permissão negada' }
  }

  // Se for default, remover default dos outros
  if (data.isDefault) {
    await db
    .from('contract_templates')
      .update({ is_default: false })
      .eq('workspace_id', current.workspace_id)
      .eq('template_type', current.template_type)
      .neq('id', templateId)
  }

  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  }

  if (data.name !== undefined) updateData.name = data.name
  if (data.description !== undefined) updateData.description = data.description
  if (data.contentHtml !== undefined) updateData.content_html = data.contentHtml
  if (data.contentMarkdown !== undefined) updateData.content_markdown = data.contentMarkdown
  if (data.variablesSchema !== undefined) updateData.variables_schema = data.variablesSchema
  if (data.isDefault !== undefined) updateData.is_default = data.isDefault
  if (data.isActive !== undefined) updateData.is_active = data.isActive

  const { error } = await db
    .from('contract_templates')
    .update(updateData)
    .eq('id', templateId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/settings/contracts')
  return { success: true }
}

/**
 * Lista templates de contrato de um workspace
 */
export async function listContractTemplates(workspaceId: string, templateType?: string) {
  const supabase = await createClient()
  const db = supabase as any

  let query = db
    .from('contract_templates')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  if (templateType) {
    query = query.eq('template_type', templateType)
  }

  const { data, error } = await query

  if (error) {
    return { error: error.message, templates: [] }
  }

  return { templates: data || [] }
}

/**
 * Gera um contrato a partir de um template
 */
export async function generateContract(
  projectId: string,
  templateId: string,
  variablesData: Record<string, any>,
  additionalData: {
    title: string
    contractNumber?: string
    clientName: string
    clientEmail?: string
    clientCnpj?: string
    companyName?: string
    companyCnpj?: string
    contractValue?: number
    startDate?: string
    endDate?: string
    paymentTerms?: string
    scopeSummary?: string
  }
) {
  const supabase = await createClient()
  const db = supabase as any
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Não autenticado' }
  }

  // Obter template
  const { data: template } = await db
    .from('contract_templates')
    .select('*')
    .eq('id', templateId)
    .single()

  if (!template) {
    return { error: 'Template não encontrado' }
  }

  // Verificar acesso ao projeto
  const { data: project } = await db
    .from('projects')
    .select('workspace_id')
    .eq('id', projectId)
    .single()

  if (!project) {
    return { error: 'Projeto não encontrado' }
  }

  const { data: membership } = await db
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', project.workspace_id)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'admin', 'manager'].includes(membership.role)) {
    return { error: 'Permissão negada' }
  }

  // Inserir contrato
  const { data: contract, error } = await db
    .from('contracts')
    .insert({
      project_id: projectId,
      template_id: templateId,
      title: additionalData.title,
      contract_number: additionalData.contractNumber,
      status: 'draft',
      client_name: additionalData.clientName,
      client_email: additionalData.clientEmail,
      client_cnpj: additionalData.clientCnpj,
      company_name: additionalData.companyName,
      company_cnpj: additionalData.companyCnpj,
      contract_value: additionalData.contractValue,
      start_date: additionalData.startDate,
      end_date: additionalData.endDate,
      payment_terms: additionalData.paymentTerms,
      scope_summary: additionalData.scopeSummary,
      variables_data: variablesData,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/projects/${projectId}/contracts`)
  revalidatePath(`/projects/${projectId}/finance`)
  return { success: true, contract }
}

/**
 * Lista contratos de um projeto
 */
export async function listProjectContracts(projectId: string) {
  const supabase = await createClient()
  const db = supabase as any

  const { data, error } = await db
    .from('contracts')
    .select(`
      *,
      contract_signatures (*),
      contract_templates (
        name,
        template_type
      )
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) {
    return { error: error.message, contracts: [] }
  }

  return { contracts: data || [] }
}

/**
 * Atualiza status do contrato
 */
export async function updateContractStatus(
  contractId: string,
  status: 'draft' | 'pending_signature' | 'signed' | 'expired' | 'cancelled',
  additionalData?: {
    signedBy?: string
    signatureProvider?: string
    pdfPath?: string
    pdfUrl?: string
  }
) {
  const supabase = await createClient()
  const db = supabase as any
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Não autenticado' }
  }

  const updateData: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (status === 'signed') {
    updateData.signed_at = new Date().toISOString()
    if (additionalData?.signedBy) updateData.signed_by = additionalData.signedBy
    if (additionalData?.signatureProvider) updateData.signature_provider = additionalData.signatureProvider
  }

  if (additionalData?.pdfPath) updateData.pdf_path = additionalData.pdfPath
  if (additionalData?.pdfUrl) updateData.pdf_url = additionalData.pdfUrl

  const { error } = await db
    .from('contracts')
    .update(updateData)
    .eq('id', contractId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/projects/*/contracts`)
  return { success: true }
}

/**
 * Adiciona signatário a um contrato
 */
export async function addContractSigner(
  contractId: string,
  signerData: {
    signerName: string
    signerEmail: string
    signerRole: 'client' | 'company' | 'witness'
    signOrder: number
  }
) {
  const supabase = await createClient()
  const db = supabase as any
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Não autenticado' }
  }

  const { data: signature, error } = await db
    .from('contract_signatures')
    .insert({
      contract_id: contractId,
      signer_name: signerData.signerName,
      signer_email: signerData.signerEmail,
      signer_role: signerData.signerRole,
      sign_order: signerData.signOrder,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Atualizar contrato para pending_signature se ainda for draft
  await db
    .from('contracts')
    .update({ status: 'pending_signature' })
    .eq('id', contractId)
    .eq('status', 'draft')

  revalidatePath(`/projects/*/contracts`)
  return { success: true, signature }
}

/**
 * Registra assinatura de contrato
 */
export async function signContract(
  signatureId: string,
  signerEmail: string,
  ipAddress: string,
  signatureImagePath?: string
) {
  const supabase = await createClient()
  const db = supabase as any

  // Verificar se email corresponde
  const { data: signature } = await db
    .from('contract_signatures')
    .select('signer_email, contract_id')
    .eq('id', signatureId)
    .single()

  if (!signature) {
    return { error: 'Assinatura não encontrada' }
  }

  if (signature.signer_email !== signerEmail) {
    return { error: 'Email não corresponde ao signatário' }
  }

  const { error } = await db
    .from('contract_signatures')
    .update({
      status: 'signed',
      signed_at: new Date().toISOString(),
      ip_address: ipAddress,
      signature_image_path: signatureImagePath,
    })
    .eq('id', signatureId)

  if (error) {
    return { error: error.message }
  }

  // Verificar se todas as assinaturas foram concluídas
  const { data: allSignatures } = await db
    .from('contract_signatures')
    .select('status')
    .eq('contract_id', signature.contract_id)

  const allSigned = allSignatures?.every((s: any) => s.status === 'signed')

  if (allSigned) {
    await db
    .from('contracts')
      .update({ status: 'signed', signed_at: new Date().toISOString() })
      .eq('id', signature.contract_id)
  }

  revalidatePath(`/p/contracts/${signature.contract_id}`)
  return { success: true }
}
