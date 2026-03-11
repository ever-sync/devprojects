'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { notifyMeetingInvitees } from '@/lib/notification-events'

export type MeetingInvitee = {
  id: string | null
  name: string
  email: string
  type: 'team' | 'client'
}

export async function createMeeting(data: {
  title: string
  description: string | null
  clientId: string
  projectId: string | null
  scheduledDate: string       // YYYY-MM-DD
  scheduledTime: string       // HH:MM
  locationType: 'meet' | 'local'
  locationUrl: string | null
  locationAddress: string | null
  invitees: MeetingInvitee[]
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') return { error: 'Acesso negado' }

  const { data: meeting, error } = await supabase
    .from('meetings')
    .insert({
      title: data.title,
      description: data.description,
      client_id: data.clientId,
      project_id: data.projectId,
      scheduled_date: data.scheduledDate,
      scheduled_time: data.scheduledTime,
      location_type: data.locationType,
      location_url: data.locationUrl,
      location_address: data.locationAddress,
      invitees: data.invitees,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  await notifyMeetingInvitees({
    meetingId: meeting.id,
    projectId: data.projectId,
    title: data.title,
    scheduledDate: data.scheduledDate,
    scheduledTime: data.scheduledTime,
    locationType: data.locationType,
    locationUrl: data.locationUrl,
    locationAddress: data.locationAddress,
    invitees: data.invitees.map((invitee) => ({
      userId: invitee.id,
      email: invitee.email,
      fullName: invitee.name,
    })),
  })

  revalidatePath('/dashboard')
  return { success: true, meetingId: meeting.id }
}

export async function updateMeetingMinutes(meetingId: string, minutes: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') return { error: 'Acesso negado' }

  const { error } = await supabase
    .from('meetings')
    .update({ minutes, updated_at: new Date().toISOString() })
    .eq('id', meetingId)

  if (error) return { error: error.message }

  revalidatePath('/projects')
  return { success: true }
}

export async function analyzeMeetingMinutes(meetingId: string, minutes: string, meetingTitle: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') return { error: 'Acesso negado' }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { error: 'Chave da API de IA não configurada' }

  const prompt = `Você é um assistente de negócios especializado em análise de reuniões.

Analise a ata da reunião intitulada "${meetingTitle}" e gere um resumo executivo em português brasileiro com:

1. **Principais pontos discutidos** (bullet points concisos)
2. **Decisões tomadas**
3. **Próximos passos / Ações definidas** (com responsáveis se mencionados)

Seja objetivo e direto. Máximo de 300 palavras.

---
ATA DA REUNIÃO:
${minutes}`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    return { error: `Erro na API de IA: ${err}` }
  }

  const result = await response.json() as {
    content: Array<{ type: string; text: string }>
  }

  const summary = result.content?.[0]?.text ?? ''

  // Save summary back to the meeting
  await supabase
    .from('meetings')
    .update({ minutes_summary: summary, updated_at: new Date().toISOString() })
    .eq('id', meetingId)

  revalidatePath('/projects')
  return { success: true, summary }
}
