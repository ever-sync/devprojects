'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  changeRequestSchema,
  projectBaselineSchema,
  scopeVersionSchema,
  type ChangeRequestInput,
  type ProjectBaselineInput,
  type ScopeVersionInput,
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

export async function getProjectScopeData(projectId: string) {
  const { supabase, user } = await requireUser()
  if (!user) return { error: 'Nao autenticado' }

  const [projectRes, scopeRes, changeRequestsRes] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, baseline_start_date, baseline_end_date, baseline_hours, baseline_value, margin_percent, contract_value, scope_version_current_id')
      .eq('id', projectId)
      .single(),
    supabase
      .from('project_scope_versions')
      .select('*')
      .eq('project_id', projectId)
      .order('version_number', { ascending: false }),
    supabase
      .from('change_requests')
      .select('*, items:change_request_items(*)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false }),
  ])

  if (projectRes.error || !projectRes.data) return { error: 'Projeto nao encontrado' }
  if (scopeRes.error) return { error: scopeRes.error.message }
  if (changeRequestsRes.error) return { error: changeRequestsRes.error.message }

  return {
    error: null,
    project: projectRes.data,
    scopeVersions: scopeRes.data ?? [],
    changeRequests: changeRequestsRes.data ?? [],
  }
}

export async function updateProjectBaseline(projectId: string, data: ProjectBaselineInput) {
  const { supabase, user, role } = await requireUser()
  if (!user) return { error: 'Nao autenticado' }
  if (role !== 'admin') return { error: 'Acesso negado' }

  const parsed = projectBaselineSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados invalidos' }

  const { error } = await supabase
    .from('projects')
    .update({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId)

  if (error) return { error: error.message }

  revalidatePath(`/projects/${projectId}`)
  revalidatePath(`/projects/${projectId}/scope`)
  return { success: true }
}

export async function createScopeVersion(projectId: string, data: ScopeVersionInput) {
  const { supabase, user, role } = await requireUser()
  if (!user) return { error: 'Nao autenticado' }
  if (role !== 'admin') return { error: 'Acesso negado' }

  const parsed = scopeVersionSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados invalidos' }

  const { data: latest } = await supabase
    .from('project_scope_versions')
    .select('version_number')
    .eq('project_id', projectId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextVersion = (latest?.version_number ?? 0) + 1

  const { data: created, error } = await supabase
    .from('project_scope_versions')
    .insert({
      project_id: projectId,
      version_number: nextVersion,
      created_by: user.id,
      ...parsed.data,
    })
    .select()
    .single()

  if (error || !created) return { error: error?.message ?? 'Nao foi possivel criar a versao' }

  await supabase
    .from('projects')
    .update({
      scope_definition: parsed.data.scope_body,
      scope_version_current_id: created.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId)

  revalidatePath(`/projects/${projectId}`)
  revalidatePath(`/projects/${projectId}/scope`)
  return { success: true, data: created }
}

export async function createChangeRequest(projectId: string, data: ChangeRequestInput) {
  const { supabase, user, role } = await requireUser()
  if (!user) return { error: 'Nao autenticado' }
  if (role !== 'admin') return { error: 'Acesso negado' }

  const parsed = changeRequestSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados invalidos' }

  const { items, ...requestData } = parsed.data
  const { data: created, error } = await supabase
    .from('change_requests')
    .insert({
      project_id: projectId,
      requested_by: user.id,
      status: 'submitted',
      ...requestData,
    })
    .select()
    .single()

  if (error || !created) return { error: error?.message ?? 'Nao foi possivel criar a solicitacao' }

  if (items.length > 0) {
    const { error: itemsError } = await supabase
      .from('change_request_items')
      .insert(items.map((item) => ({
        change_request_id: created.id,
        ...item,
      })))

    if (itemsError) {
      await supabase.from('change_requests').delete().eq('id', created.id)
      return { error: itemsError.message }
    }
  }

  revalidatePath(`/projects/${projectId}/scope`)
  return { success: true }
}

export async function updateChangeRequestStatus(
  projectId: string,
  changeRequestId: string,
  status: 'approved' | 'rejected'
) {
  const { supabase, user, role } = await requireUser()
  if (!user) return { error: 'Nao autenticado' }
  if (role !== 'admin') return { error: 'Acesso negado' }

  const payload = status === 'approved'
    ? { status, approved_at: new Date().toISOString(), approved_by: user.id, updated_at: new Date().toISOString() }
    : { status, approved_at: null, approved_by: null, updated_at: new Date().toISOString() }

  const { error } = await supabase
    .from('change_requests')
    .update(payload)
    .eq('id', changeRequestId)
    .eq('project_id', projectId)

  if (error) return { error: error.message }

  revalidatePath(`/projects/${projectId}/scope`)
  return { success: true }
}
