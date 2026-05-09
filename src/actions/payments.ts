'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' as const }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Acesso negado' as const }
  return { supabase, user }
}

export type PaymentMethod = 'pix' | 'boleto' | 'credit_card' | 'transfer' | 'other'

export async function updateMilestonePayment(
  milestoneId: string,
  projectId: string,
  input: {
    paymentMethod?: PaymentMethod
    paymentLink?: string
    paymentInstructions?: string
  }
) {
  const ctx = await requireAdmin()
  if ('error' in ctx) return { error: ctx.error }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (ctx.supabase as any)
    .from('billing_milestones')
    .update({
      payment_method: input.paymentMethod ?? null,
      payment_link: input.paymentLink ?? null,
      payment_instructions: input.paymentInstructions ?? null,
    })
    .eq('id', milestoneId)

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/finance`)
  return { error: null }
}

export async function confirmMilestonePayment(milestoneId: string, projectId: string) {
  const ctx = await requireAdmin()
  if ('error' in ctx) return { error: ctx.error }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (ctx.supabase as any)
    .from('billing_milestones')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', milestoneId)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}/finance`)
  return { error: null }
}
