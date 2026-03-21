'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

type AppSupabaseClient = SupabaseClient<Database>

export type WorkspaceFeature =
  | 'public_portal'
  | 'finance'
  | 'advanced_analytics'

const FEATURE_MATRIX: Record<string, WorkspaceFeature[]> = {
  starter: [],
  growth: ['public_portal', 'finance'],
  scale: ['public_portal', 'finance', 'advanced_analytics'],
}

type PlanKeyRow = {
  plans: {
    key: string
    name: string
  } | null
} | null

async function getWorkspacePlan(supabase: AppSupabaseClient, workspaceId: string) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('plans(key, name)')
    .eq('workspace_id', workspaceId)
    .maybeSingle()
    .returns<PlanKeyRow>()

  if (error) return { plan: null, error }
  return { plan: data?.plans ?? null, error: null }
}

export async function workspaceHasFeature(
  supabase: AppSupabaseClient,
  workspaceId: string,
  feature: WorkspaceFeature,
) {
  const { plan, error } = await getWorkspacePlan(supabase, workspaceId)
  if (error) return { allowed: false, error: error.message, planName: null }
  if (!plan) return { allowed: true, error: null, planName: null }

  const features = FEATURE_MATRIX[plan.key] ?? []
  return {
    allowed: features.includes(feature),
    error: features.includes(feature)
      ? null
      : `Recurso disponivel apenas em planos superiores ao ${plan.name}`,
    planName: plan.name,
  }
}
