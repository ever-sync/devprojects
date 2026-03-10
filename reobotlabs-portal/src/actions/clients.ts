'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { createAuditLog, getClientWorkspaceId } from '@/lib/workspace-access'
import { checkWorkspaceMemberLimit } from '@/lib/workspace-limits'
import { clientSchema, inviteUserSchema, type ClientInput, type InviteUserInput } from '@/lib/validations'

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, role: null }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return { supabase, user, role: profile?.role ?? null }
}

export async function createClientRecord(
  data: ClientInput,
  portalAccess?: { full_name: string; email: string; password: string } | null,
) {
  const { supabase, user, role } = await requireAdmin()
  if (!user) return { error: 'Nao autenticado' }
  if (role !== 'admin') return { error: 'Acesso negado' }

  const parsed = clientSchema.safeParse(data)
  if (!parsed.success) return { error: 'Dados invalidos' }

  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .insert({
      name: parsed.data.name,
      slug: `${parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'workspace'}-${crypto.randomUUID().slice(0, 8)}`,
      owner_user_id: user.id,
    })
    .select('id')
    .single()

  if (workspaceError) return { error: workspaceError.message }

  const { data: client, error } = await supabase
    .from('clients')
    .insert({ ...parsed.data, created_by: user.id, workspace_id: workspace.id })
    .select()
    .single()

  if (error) {
    await supabase.from('workspaces').delete().eq('id', workspace.id)
    return { error: error.message }
  }

  const { error: ownerMembershipError } = await supabase.from('workspace_members').upsert({
    workspace_id: workspace.id,
    user_id: user.id,
    role: 'owner',
  })

  if (ownerMembershipError) return { error: ownerMembershipError.message }

  await createAuditLog(supabase, {
    workspaceId: workspace.id,
    actorUserId: user.id,
    entityType: 'client',
    entityId: client.id,
    action: 'client.created',
    metadata: { clientName: client.name },
  })

  if (portalAccess?.email && portalAccess?.password) {
    const memberLimitCheck = await checkWorkspaceMemberLimit(supabase, workspace.id)
    if (!memberLimitCheck.allowed) return { error: memberLimitCheck.error ?? 'Limite de membros atingido' }

    const adminClient = createAdminClient()
    const { data: newUser, error: authError } = await adminClient.auth.admin.createUser({
      email: portalAccess.email,
      password: portalAccess.password,
      email_confirm: true,
      user_metadata: {
        full_name: portalAccess.full_name,
        role: 'client',
      },
    })

    if (!authError && newUser?.user) {
      const { error: memberError } = await supabase.from('workspace_members').upsert({
        workspace_id: workspace.id,
        user_id: newUser.user.id,
        role: 'member',
      })

      if (memberError) return { error: memberError.message }

      await createAuditLog(supabase, {
        workspaceId: workspace.id,
        actorUserId: user.id,
        entityType: 'workspace_member',
        entityId: null,
        action: 'workspace_member.created_from_portal_access',
        metadata: {
          clientId: client.id,
          invitedUserId: newUser.user.id,
          invitedUserEmail: portalAccess.email,
        },
      })
    }
  }

  revalidatePath('/clients')
  redirect(`/clients/${client.id}`)
}

export async function updateClientRecord(id: string, data: Partial<ClientInput>) {
  const { supabase, user, role } = await requireAdmin()
  if (!user) return { error: 'Nao autenticado' }
  if (role !== 'admin') return { error: 'Acesso negado' }

  const { error } = await supabase
    .from('clients')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }

  const { workspaceId } = await getClientWorkspaceId(supabase, id)
  await createAuditLog(supabase, {
    workspaceId,
    actorUserId: user.id,
    entityType: 'client',
    entityId: id,
    action: 'client.updated',
    metadata: { fields: Object.keys(data) },
  })

  revalidatePath(`/clients/${id}`)
  revalidatePath('/clients')
  return { success: true }
}

export async function inviteClientUser(data: InviteUserInput) {
  const { supabase, user, role } = await requireAdmin()
  if (!user) return { error: 'Nao autenticado' }
  if (role !== 'admin') return { error: 'Acesso negado' }

  const parsed = inviteUserSchema.safeParse(data)
  if (!parsed.success) return { error: 'Dados invalidos' }

  const { workspaceId, error: workspaceError } = await getClientWorkspaceId(supabase, parsed.data.client_id)
  if (workspaceError) return { error: workspaceError.message }
  if (!workspaceId) return { error: 'Workspace do cliente nao encontrado' }

  const memberLimitCheck = await checkWorkspaceMemberLimit(supabase, workspaceId)
  if (!memberLimitCheck.allowed) return { error: memberLimitCheck.error ?? 'Limite de membros atingido' }

  const adminClient = createAdminClient()
  const { data: invitedUser, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    parsed.data.email,
    {
      data: {
        full_name: parsed.data.full_name,
        role: 'client',
      },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`,
    },
  )

  if (inviteError) return { error: inviteError.message }

  const { error: memberError } = await supabase.from('workspace_members').upsert({
    workspace_id: workspaceId,
    user_id: invitedUser.user.id,
    role: 'member',
  })

  if (memberError) return { error: memberError.message }

  await createAuditLog(supabase, {
    workspaceId,
    actorUserId: user.id,
    entityType: 'workspace_member',
    entityId: null,
    action: 'workspace_member.invited',
    metadata: {
      clientId: parsed.data.client_id,
      invitedUserId: invitedUser.user.id,
      invitedUserEmail: parsed.data.email,
      role: 'member',
    },
  })

  revalidatePath(`/clients/${parsed.data.client_id}`)
  revalidatePath('/team')
  return { success: true }
}

export async function updateClientWorkspaceMemberRole(
  clientId: string,
  memberId: string,
  roleValue: 'admin' | 'member',
) {
  const { supabase, user, role } = await requireAdmin()
  if (!user) return { error: 'Nao autenticado' }
  if (role !== 'admin') return { error: 'Acesso negado' }

  const { workspaceId, error: workspaceError } = await getClientWorkspaceId(supabase, clientId)
  if (workspaceError) return { error: workspaceError.message }
  if (!workspaceId) return { error: 'Workspace do cliente nao encontrado' }

  const { data: member, error: memberLookupError } = await supabase
    .from('workspace_members')
    .select('id, role')
    .eq('id', memberId)
    .eq('workspace_id', workspaceId)
    .single()

  if (memberLookupError) return { error: memberLookupError.message }
  if (member.role === 'owner') return { error: 'Nao e possivel alterar o owner do workspace' }

  const { error } = await supabase
    .from('workspace_members')
    .update({ role: roleValue })
    .eq('id', memberId)
    .eq('workspace_id', workspaceId)

  if (error) return { error: error.message }

  await createAuditLog(supabase, {
    workspaceId,
    actorUserId: user.id,
    entityType: 'workspace_member',
    entityId: memberId,
    action: 'workspace_member.role_updated',
    metadata: {
      clientId,
      role: roleValue,
    },
  })

  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/team')
  return { success: true }
}

export async function removeClientWorkspaceMember(clientId: string, memberId: string) {
  const { supabase, user, role } = await requireAdmin()
  if (!user) return { error: 'Nao autenticado' }
  if (role !== 'admin') return { error: 'Acesso negado' }

  const { workspaceId, error: workspaceError } = await getClientWorkspaceId(supabase, clientId)
  if (workspaceError) return { error: workspaceError.message }
  if (!workspaceId) return { error: 'Workspace do cliente nao encontrado' }

  const { data: member, error: memberLookupError } = await supabase
    .from('workspace_members')
    .select('id, user_id, role')
    .eq('id', memberId)
    .eq('workspace_id', workspaceId)
    .single()

  if (memberLookupError) return { error: memberLookupError.message }
  if (member.role === 'owner') return { error: 'Nao e possivel remover o owner do workspace' }

  const { error: workspaceDeleteError } = await supabase
    .from('workspace_members')
    .delete()
    .eq('id', memberId)
    .eq('workspace_id', workspaceId)

  if (workspaceDeleteError) return { error: workspaceDeleteError.message }

  await createAuditLog(supabase, {
    workspaceId,
    actorUserId: user.id,
    entityType: 'workspace_member',
    entityId: memberId,
    action: 'workspace_member.removed',
    metadata: {
      clientId,
      removedUserId: member.user_id,
      previousRole: member.role,
    },
  })

  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/team')
  return { success: true }
}
