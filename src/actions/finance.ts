'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAuditLog, getProjectWorkspaceId } from '@/lib/workspace-access'
import { workspaceHasFeature } from '@/lib/workspace-features'
import {
  billingMilestoneSchema,
  contractSchema,
  invoiceSchema,
  type BillingMilestoneInput,
  type ContractInput,
  type InvoiceInput,
} from '@/lib/validations'

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, role: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return { supabase, user, role: profile?.role ?? null }
}

async function ensureFinanceFeature(supabase: Awaited<ReturnType<typeof createClient>>, projectId: string) {
  const { workspaceId, error } = await getProjectWorkspaceId(supabase, projectId)
  if (error) return { workspaceId: null, error: error.message }
  if (!workspaceId) return { workspaceId: null, error: 'Workspace do projeto nao encontrado' }

  const access = await workspaceHasFeature(supabase, workspaceId, 'finance')
  if (!access.allowed) {
    return {
      workspaceId,
      error: access.error ?? 'Financeiro indisponivel no plano atual',
    }
  }

  return { workspaceId, error: null }
}

export async function getProjectFinanceData(projectId: string) {
  const { supabase, user } = await requireUser()
  if (!user) {
    return {
      error: 'Nao autenticado',
      contract: null,
      milestones: [],
      invoices: [],
      invoiceEvents: [],
    }
  }

  const featureAccess = await ensureFinanceFeature(supabase, projectId)
  if (featureAccess.error) {
    return {
      error: featureAccess.error,
      contract: null,
      milestones: [],
      invoices: [],
      invoiceEvents: [],
    }
  }

  const [contractRes, milestonesRes, invoicesRes] = await Promise.all([
    supabase.from('contracts').select('*').eq('project_id', projectId).maybeSingle(),
    supabase
      .from('billing_milestones')
      .select('*')
      .eq('project_id', projectId)
      .order('due_date', { ascending: true }),
    supabase
      .from('invoices')
      .select('*')
      .eq('project_id', projectId)
      .order('issue_date', { ascending: false }),
  ])

  const invoiceIds = (invoicesRes.data ?? []).map((invoice) => invoice.id)
  const invoiceEventsRes = invoiceIds.length > 0
    ? await supabase
        .from('invoice_events')
        .select('*')
        .in('invoice_id', invoiceIds)
        .order('created_at', { ascending: false })
    : { data: [], error: null }

  if (contractRes.error) return { error: contractRes.error.message, contract: null, milestones: [], invoices: [], invoiceEvents: [] }
  if (milestonesRes.error) return { error: milestonesRes.error.message, contract: null, milestones: [], invoices: [], invoiceEvents: [] }
  if (invoicesRes.error) return { error: invoicesRes.error.message, contract: null, milestones: [], invoices: [], invoiceEvents: [] }
  if (invoiceEventsRes.error) return { error: invoiceEventsRes.error.message, contract: null, milestones: [], invoices: [], invoiceEvents: [] }

  return {
    error: null,
    contract: contractRes.data ?? null,
    milestones: milestonesRes.data ?? [],
    invoices: invoicesRes.data ?? [],
    invoiceEvents: invoiceEventsRes.data ?? [],
  }
}

export async function upsertContract(projectId: string, data: ContractInput) {
  const { supabase, user, role } = await requireUser()
  if (!user) return { error: 'Nao autenticado' }
  if (role !== 'admin') return { error: 'Acesso negado' }
  const featureAccess = await ensureFinanceFeature(supabase, projectId)
  if (featureAccess.error) return { error: featureAccess.error }

  const parsed = contractSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados invalidos' }

  const { data: contract, error } = await supabase
    .from('contracts')
    .upsert({
      project_id: projectId,
      created_by: user.id,
      ...parsed.data,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'project_id' })
    .select('id')
    .single()

  if (error) return { error: error.message }

  await supabase
    .from('projects')
    .update({
      contract_value: parsed.data.total_value,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId)

  await createAuditLog(supabase, {
    workspaceId: featureAccess.workspaceId,
    actorUserId: user.id,
    entityType: 'contract',
    entityId: contract?.id ?? null,
    action: 'finance.contract_upserted',
    metadata: {
      projectId,
      totalValue: parsed.data.total_value,
      contractType: parsed.data.contract_type,
      currency: parsed.data.currency,
    },
  })

  revalidatePath(`/projects/${projectId}`)
  revalidatePath(`/projects/${projectId}/finance`)
  revalidatePath(`/projects/${projectId}/productivity`)
  return { success: true }
}

export async function createBillingMilestone(projectId: string, contractId: string | null, data: BillingMilestoneInput) {
  const { supabase, user, role } = await requireUser()
  if (!user) return { error: 'Nao autenticado' }
  if (role !== 'admin') return { error: 'Acesso negado' }
  const featureAccess = await ensureFinanceFeature(supabase, projectId)
  if (featureAccess.error) return { error: featureAccess.error }

  const parsed = billingMilestoneSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados invalidos' }

  const { data: milestone, error } = await supabase
    .from('billing_milestones')
    .insert({
      project_id: projectId,
      contract_id: contractId,
      created_by: user.id,
      ...parsed.data,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  await createAuditLog(supabase, {
    workspaceId: featureAccess.workspaceId,
    actorUserId: user.id,
    entityType: 'billing_milestone',
    entityId: milestone?.id ?? null,
    action: 'finance.billing_milestone_created',
    metadata: {
      projectId,
      contractId,
      title: parsed.data.title,
      amount: parsed.data.amount,
      status: parsed.data.status,
    },
  })

  revalidatePath(`/projects/${projectId}/finance`)
  return { success: true }
}

export async function updateBillingMilestoneStatus(
  projectId: string,
  milestoneId: string,
  status: 'planned' | 'ready' | 'invoiced' | 'paid'
) {
  const { supabase, user, role } = await requireUser()
  if (!user) return { error: 'Nao autenticado' }
  if (role !== 'admin') return { error: 'Acesso negado' }
  const featureAccess = await ensureFinanceFeature(supabase, projectId)
  if (featureAccess.error) return { error: featureAccess.error }

  const { error } = await supabase
    .from('billing_milestones')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', milestoneId)
    .eq('project_id', projectId)

  if (error) return { error: error.message }

  await createAuditLog(supabase, {
    workspaceId: featureAccess.workspaceId,
    actorUserId: user.id,
    entityType: 'billing_milestone',
    entityId: milestoneId,
    action: 'finance.billing_milestone_status_updated',
    metadata: {
      projectId,
      status,
    },
  })

  revalidatePath(`/projects/${projectId}/finance`)
  return { success: true }
}

export async function createInvoice(projectId: string, contractId: string | null, data: InvoiceInput) {
  const { supabase, user, role } = await requireUser()
  if (!user) return { error: 'Nao autenticado' }
  if (role !== 'admin') return { error: 'Acesso negado' }
  const featureAccess = await ensureFinanceFeature(supabase, projectId)
  if (featureAccess.error) return { error: featureAccess.error }

  const parsed = invoiceSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados invalidos' }

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      project_id: projectId,
      contract_id: contractId,
      created_by: user.id,
      ...parsed.data,
    })
    .select()
    .single()

  if (error || !invoice) return { error: error?.message ?? 'Nao foi possivel criar a invoice' }

  await supabase.from('invoice_events').insert({
    invoice_id: invoice.id,
    event_type: parsed.data.status === 'draft' ? 'note' : parsed.data.status,
    description: `Invoice criada com status ${parsed.data.status}`,
    created_by: user.id,
  })

  if (parsed.data.billing_milestone_id) {
    await supabase
      .from('billing_milestones')
      .update({
        status: parsed.data.status === 'paid' ? 'paid' : 'invoiced',
        updated_at: new Date().toISOString(),
      })
      .eq('id', parsed.data.billing_milestone_id)
  }

  await createAuditLog(supabase, {
    workspaceId: featureAccess.workspaceId,
    actorUserId: user.id,
    entityType: 'invoice',
    entityId: invoice.id,
    action: 'finance.invoice_created',
    metadata: {
      projectId,
      contractId,
      billingMilestoneId: parsed.data.billing_milestone_id ?? null,
      invoiceNumber: parsed.data.invoice_number,
      amount: parsed.data.amount,
      status: parsed.data.status,
    },
  })

  revalidatePath(`/projects/${projectId}/finance`)
  return { success: true }
}

export async function updateInvoiceStatus(
  projectId: string,
  invoiceId: string,
  status: 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled'
) {
  const { supabase, user, role } = await requireUser()
  if (!user) return { error: 'Nao autenticado' }
  if (role !== 'admin') return { error: 'Acesso negado' }
  const featureAccess = await ensureFinanceFeature(supabase, projectId)
  if (featureAccess.error) return { error: featureAccess.error }

  const { data: invoice, error: invoiceLookupError } = await supabase
    .from('invoices')
    .select('billing_milestone_id')
    .eq('id', invoiceId)
    .eq('project_id', projectId)
    .single()

  if (invoiceLookupError) return { error: invoiceLookupError.message }

  const { error } = await supabase
    .from('invoices')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', invoiceId)
    .eq('project_id', projectId)

  if (error) return { error: error.message }

  await supabase.from('invoice_events').insert({
    invoice_id: invoiceId,
    event_type: status === 'draft' ? 'note' : status,
    description: `Status alterado para ${status}`,
    created_by: user.id,
  })

  if (invoice.billing_milestone_id) {
    const milestoneStatus =
      status === 'paid'
        ? 'paid'
        : status === 'issued' || status === 'overdue'
          ? 'invoiced'
          : status === 'cancelled' || status === 'draft'
            ? 'ready'
            : null

    if (milestoneStatus) {
      await supabase
        .from('billing_milestones')
        .update({
          status: milestoneStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoice.billing_milestone_id)
        .eq('project_id', projectId)
    }
  }

  await createAuditLog(supabase, {
    workspaceId: featureAccess.workspaceId,
    actorUserId: user.id,
    entityType: 'invoice',
    entityId: invoiceId,
    action: 'finance.invoice_status_updated',
    metadata: {
      projectId,
      status,
      billingMilestoneId: invoice.billing_milestone_id ?? null,
    },
  })

  revalidatePath(`/projects/${projectId}/finance`)
  return { success: true }
}
