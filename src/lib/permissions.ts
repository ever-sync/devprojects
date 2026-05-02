'use server'

import { createClient } from '@/lib/supabase/server'
import { cache } from 'react'

export type SystemRole = 'admin' | 'client'
export type JobRole = 'manager' | 'developer' | 'designer' | 'finance' | 'other'

export interface UserPermissions {
  systemRole: SystemRole
  jobRole: JobRole
  canManageUsers: boolean
  canApproveProposals: boolean
  canViewFinancials: boolean
  canManageProjects: boolean
  canManageBilling: boolean
}

export const getCurrentUserPermissions = cache(async (): Promise<UserPermissions | null> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role, job_role')
    .eq('id', user.id)
    .single() as { data: { role: string; job_role: string } | null }

  if (!profile) return null

  const systemRole = (profile.role ?? 'client') as SystemRole
  const jobRole = (profile.job_role ?? 'other') as JobRole

  return {
    systemRole,
    jobRole,
    canManageUsers: systemRole === 'admin',
    canApproveProposals: systemRole === 'admin' || jobRole === 'manager',
    canViewFinancials: systemRole === 'admin' || jobRole === 'manager' || jobRole === 'finance',
    canManageProjects: systemRole === 'admin' || jobRole === 'manager' || jobRole === 'developer',
    canManageBilling: systemRole === 'admin' || jobRole === 'finance',
  }
})

export async function requirePermission(permission: keyof UserPermissions) {
  const perms = await getCurrentUserPermissions()
  if (!perms || !perms[permission]) {
    throw new Error('Acesso negado: permissão insuficiente.')
  }
  return perms
}
