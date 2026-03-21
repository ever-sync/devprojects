'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

type AppSupabaseClient = SupabaseClient<Database>

type SubscriptionPlanRow = {
  seats: number
  plans: {
    name: string
    key: string
    project_limit: number | null
    member_limit: number | null
  } | null
} | null

async function getWorkspaceSubscriptionPlan(
  supabase: AppSupabaseClient,
  workspaceId: string,
) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('seats, plans(name, key, project_limit, member_limit)')
    .eq('workspace_id', workspaceId)
    .maybeSingle()
    .returns<SubscriptionPlanRow>()

  if (error) return { subscription: null, error }
  return { subscription: data, error: null }
}

export async function checkWorkspaceProjectLimit(
  supabase: AppSupabaseClient,
  workspaceId: string,
) {
  const { subscription, error } = await getWorkspaceSubscriptionPlan(supabase, workspaceId)
  if (error || !subscription?.plans) {
    return { allowed: true, error: error?.message ?? null }
  }

  const projectLimit = subscription.plans.project_limit
  if (projectLimit == null) return { allowed: true, error: null }

  const { count, error: countError } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)

  if (countError) return { allowed: false, error: countError.message }
  if ((count ?? 0) >= projectLimit) {
    return {
      allowed: false,
      error: `Limite de projetos do plano ${subscription.plans.name} atingido`,
    }
  }

  return { allowed: true, error: null }
}

export async function checkWorkspaceMemberLimit(
  supabase: AppSupabaseClient,
  workspaceId: string,
) {
  const { subscription, error } = await getWorkspaceSubscriptionPlan(supabase, workspaceId)
  if (error || !subscription?.plans) {
    return { allowed: true, error: error?.message ?? null }
  }

  const planMemberLimit = subscription.plans.member_limit
  const seatLimit = subscription.seats
  const effectiveLimit = planMemberLimit == null ? seatLimit : Math.min(planMemberLimit, seatLimit)

  const { count, error: countError } = await supabase
    .from('workspace_members')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)

  if (countError) return { allowed: false, error: countError.message }
  if ((count ?? 0) >= effectiveLimit) {
    return {
      allowed: false,
      error: `Limite de membros do plano ${subscription.plans.name} atingido`,
    }
  }

  return { allowed: true, error: null }
}
