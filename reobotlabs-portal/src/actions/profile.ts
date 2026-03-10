'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getUserAccessibleClients } from '@/lib/workspace-access'
import type { NotificationSettings } from '@/types'

export async function updateProfile(data: {
  full_name: string
  phone?: string
  company?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: data.full_name,
      phone: data.phone ?? null,
      company: data.company ?? null,
    })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { success: true }
}

export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const file = formData.get('avatar') as File
  if (!file || file.size === 0) return { error: 'Nenhum arquivo selecionado' }

  const ext = file.name.split('.').pop()
  const path = `${user.id}/avatar.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true })

  if (uploadError) return { error: uploadError.message }

  const { data: urlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(path)

  const avatarUrl = urlData.publicUrl

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id)

  if (updateError) return { error: updateError.message }

  revalidatePath('/settings')
  return { success: true, avatarUrl }
}

export async function getClientNotificationSettings() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { clients } = await getUserAccessibleClients(supabase)
  const client = clients[0] ?? null
  const defaultSettings: NotificationSettings = {
    delivery_date_email: true,
    delivery_date_whatsapp: false,
    status_change_email: true,
    status_change_whatsapp: false,
  }

  const settings = (client?.notification_settings ?? defaultSettings) as NotificationSettings
  return { clientId: client?.id ?? null, settings }
}

export async function updateNotificationSettings(clientId: string, settings: NotificationSettings) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  // Verify the user belongs to this client
  const { data: accessibleClient } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .maybeSingle()

  if (!accessibleClient) return { error: 'Acesso negado' }

  const { error } = await supabase
    .from('clients')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ notification_settings: settings as any })
    .eq('id', clientId)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { success: true }
}
