'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database.types'

type PhaseTemplate = Database['public']['Tables']['phase_templates']['Row']
type PhaseTemplateInsert = Database['public']['Tables']['phase_templates']['Insert']

export async function getTemplates() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('phase_templates')
    .select('*, phase_template_items(*)')
    .order('created_at', { ascending: false })
  
  if (error) return { data: [], error: error.message }
  return { data, error: null }
}

export async function createTemplate(data: PhaseTemplateInsert & { items: string[] }) {
  const supabase = await createClient()
  const { data: template, error: tError } = await supabase
    .from('phase_templates')
    .insert({
      name: data.name,
      description: data.description,
    })
    .select()
    .single()

  if (tError) return { error: tError.message }

  if (data.items.length > 0) {
    const items = data.items.map((name, index) => ({
      template_id: template.id,
      name,
      order_index: index,
    }))

    const { error: iError } = await supabase
      .from('phase_template_items')
      .insert(items)

    if (iError) return { error: iError.message }
  }

  revalidatePath('/settings/templates')
  return { data: template, error: null }
}

export async function updateTemplate(id: string, data: Partial<PhaseTemplate> & { items?: string[] }) {
  const supabase = await createClient()
  
  const { error: tError } = await supabase
    .from('phase_templates')
    .update({
      name: data.name,
      description: data.description,
    })
    .eq('id', id)

  if (tError) return { error: tError.message }

  if (data.items) {
    // Simplified: delete all and re-insert
    await supabase.from('phase_template_items').delete().eq('template_id', id)
    
    const items = data.items.map((name, index) => ({
      template_id: id,
      name,
      order_index: index,
    }))

    const { error: iError } = await supabase
      .from('phase_template_items')
      .insert(items)

    if (iError) return { error: iError.message }
  }

  revalidatePath('/settings/templates')
  return { success: true }
}

export async function deleteTemplate(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('phase_templates')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/settings/templates')
  return { success: true }
}
