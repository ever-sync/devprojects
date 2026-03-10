'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function reorderPhase(
  phaseId: string,
  neighborId: string,
  phaseOrderIndex: number,
  neighborOrderIndex: number,
  projectId: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  // Swap order_index between the two phases
  await supabase
    .from('project_phases')
    .update({ order_index: neighborOrderIndex, updated_at: new Date().toISOString() })
    .eq('id', phaseId)

  await supabase
    .from('project_phases')
    .update({ order_index: phaseOrderIndex, updated_at: new Date().toISOString() })
    .eq('id', neighborId)

  revalidatePath(`/projects/${projectId}/timeline`)
  return { success: true }
}
