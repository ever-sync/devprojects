'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import {
  approvalDecisionSchema,
  approvalSchema,
  type ApprovalDecisionInput,
  type ApprovalInput,
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

async function saveApprovalDecision(
  approvalId: string,
  decision: 'approved' | 'revision_requested',
  approverId: string,
  useAdminClient = false,
) {
  const supabase = useAdminClient ? createAdminClient() : await createClient()
  const payload = {
    status: decision,
    approved_at: new Date().toISOString(),
    approved_by: approverId,
    updated_at: new Date().toISOString(),
  }

  return supabase
    .from('approvals')
    .update(payload)
    .eq('id', approvalId)
}

export async function getProjectApprovals(projectId: string) {
  const { supabase, user } = await requireUser()
  if (!user) return { error: 'Nao autenticado' }

  const { data, error } = await supabase
    .from('approvals')
    .select('*, items:approval_items(*)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message, data: [] }
  return { error: null, data: data ?? [] }
}

export async function createApprovalRequest(projectId: string, data: ApprovalInput) {
  const { supabase, user, role } = await requireUser()
  if (!user) return { error: 'Nao autenticado' }
  if (role !== 'admin') return { error: 'Acesso negado' }

  const parsed = approvalSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados invalidos' }

  const { items, ...approvalData } = parsed.data
  const { data: created, error } = await supabase
    .from('approvals')
    .insert({
      project_id: projectId,
      requested_by: user.id,
      ...approvalData,
    })
    .select()
    .single()

  if (error || !created) return { error: error?.message ?? 'Nao foi possivel criar a aprovacao' }

  const { error: itemsError } = await supabase
    .from('approval_items')
    .insert(items.map((item, index) => ({
      approval_id: created.id,
      sort_order: index,
      ...item,
    })))

  if (itemsError) {
    await supabase.from('approvals').delete().eq('id', created.id)
    return { error: itemsError.message }
  }

  revalidatePath(`/projects/${projectId}/approvals`)
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function decideApproval(data: ApprovalDecisionInput) {
  const { supabase, user, role } = await requireUser()
  if (!user) return { error: 'Nao autenticado' }

  const parsed = approvalDecisionSchema.safeParse(data)
  if (!parsed.success) return { error: 'Dados invalidos' }

  const { data: approval, error: approvalError } = await supabase
    .from('approvals')
    .select('project_id, status')
    .eq('id', parsed.data.approvalId)
    .single()

  if (approvalError) return { error: approvalError.message }
  if (approval.status !== 'pending') return { error: 'Aprovacao ja foi decidida' }

  const { error } = await saveApprovalDecision(
    parsed.data.approvalId,
    parsed.data.decision,
    user.id,
    role !== 'admin',
  )
  if (error) return { error: error.message }

  if (approval?.project_id) {
    revalidatePath(`/projects/${approval.project_id}/approvals`)
    revalidatePath(`/projects/${approval.project_id}`)
  }

  return { success: true }
}

export async function getPublicApprovalsByToken(token: string) {
  const supabase = createAdminClient()

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('public_token', token)
    .eq('public_enabled', true)
    .single()

  if (!project) return { error: 'Projeto nao encontrado', data: [] }

  const { data, error } = await supabase
    .from('approvals')
    .select('*, items:approval_items(*)')
    .eq('project_id', project.id)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message, data: [] }
  return { error: null, data: data ?? [] }
}

export async function decideApprovalByToken(
  token: string,
  approvalId: string,
  decision: 'approved' | 'revision_requested'
) {
  const supabase = createAdminClient()

  const { data: approval } = await supabase
    .from('approvals')
    .select('id, project_id')
    .eq('id', approvalId)
    .single()

  if (!approval) return { error: 'Aprovacao nao encontrada' }

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', approval.project_id)
    .eq('public_token', token)
    .eq('public_enabled', true)
    .single()

  if (!project) return { error: 'Nao autorizado' }

  const { error } = await supabase
    .from('approvals')
    .update({
      status: decision,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', approvalId)
    .eq('status', 'pending')

  if (error) return { error: error.message }

  revalidatePath(`/p/${token}`)
  return { success: true }
}
