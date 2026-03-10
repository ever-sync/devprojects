'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/workspace-access'
import type { SubscriptionStatus } from '@/types'

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, role: null }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return { supabase, user, role: profile?.role ?? null }
}

export async function updateWorkspaceSubscription(input: {
  workspaceId: string
  planId: string
  status: SubscriptionStatus
  seats: number
  currentPeriodEnd?: string | null
  cancelAtPeriodEnd?: boolean
}) {
  const { supabase, user, role } = await requireAdmin()
  if (!user) return { error: 'Nao autenticado' }
  if (role !== 'admin') return { error: 'Acesso negado' }
  if (!Number.isFinite(input.seats) || input.seats <= 0) return { error: 'Numero de assentos invalido' }

  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('member_limit')
    .eq('id', input.planId)
    .single()

  if (planError) return { error: planError.message }
  if (plan.member_limit != null && input.seats > plan.member_limit) {
    return { error: 'Assentos excedem o limite de membros do plano selecionado' }
  }

  const { error } = await supabase
    .from('subscriptions')
    .upsert(
      {
        workspace_id: input.workspaceId,
        plan_id: input.planId,
        status: input.status,
        seats: input.seats,
        current_period_end: input.currentPeriodEnd ?? null,
        cancel_at_period_end: input.cancelAtPeriodEnd ?? false,
      },
      {
        onConflict: 'workspace_id',
      },
    )

  if (error) return { error: error.message }

  await createAuditLog(supabase, {
    workspaceId: input.workspaceId,
    actorUserId: user.id,
    entityType: 'subscription',
    entityId: null,
    action: 'subscription.updated',
    metadata: {
      planId: input.planId,
      status: input.status,
      seats: input.seats,
      currentPeriodEnd: input.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
    },
  })

  revalidatePath('/settings/billing')
  return { success: true }
}
