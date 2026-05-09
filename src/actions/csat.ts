'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { getAppUrl } from '@/lib/app-url'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' as const }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Acesso negado' as const }
  return { supabase, user }
}

/** Cria uma pesquisa CSAT/NPS e envia por email */
export async function sendCSATRequest(input: {
  projectId: string
  clientEmail: string
  clientName: string
  clientId?: string
  type: 'csat' | 'nps'
}) {
  const ctx = await requireAdmin()
  if ('error' in ctx) return { error: ctx.error }
  const supabase = createAdminClient()
  const appUrl = getAppUrl()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).from('csat_responses').insert({
    project_id: input.projectId,
    client_id: input.clientId ?? null,
    respondent: input.clientName,
    type: input.type,
    score: 0, // será preenchido na resposta
  }).select('token').single()

  if (error) return { error: error.message }
  const token = (data as { token: string }).token
  const surveyUrl = `${appUrl}/feedback/${token}`
  const label = input.type === 'nps' ? 'Net Promoter Score' : 'Avaliação de Satisfação'

  await sendEmail({
    to: input.clientEmail,
    subject: `${label} — como foi nossa entrega?`,
    html: `
      <p>Olá, ${input.clientName}!</p>
      <p>Gostaríamos de saber como foi sua experiência com nosso trabalho.</p>
      <p>Leva menos de 1 minuto:</p>
      <p><a href="${surveyUrl}" style="background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Responder pesquisa</a></p>
      <p style="color:#888;font-size:12px;">Ou acesse: ${surveyUrl}</p>
    `,
  })

  return { error: null, token }
}

/** Registra a resposta (chamado do endpoint público) */
export async function submitCSATResponse(token: string, score: number, comment?: string) {
  if (score < 0 || score > 10) return { error: 'Score inválido.' }
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('csat_responses')
    .update({ score, comment: comment ?? null, answered_at: new Date().toISOString() })
    .eq('token', token)
    .is('answered_at', null) // só permite responder uma vez
  if (error) return { error: error.message }
  return { error: null }
}

/** Verifica se token é válido e ainda não foi respondido */
export async function getCSATByToken(token: string) {
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).from('csat_responses')
    .select('id, type, answered_at, project:projects(name)')
    .eq('token', token)
    .single()
  if (error) return { error: error.message, survey: null }
  return { error: null, survey: data as { id: string; type: 'csat' | 'nps'; answered_at: string | null; project: { name: string } | null } }
}

export async function getCSATDashboard() {
  const ctx = await requireAdmin()
  if ('error' in ctx) return { error: ctx.error, data: null }
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).from('csat_responses')
    .select('*, project:projects(id, name)')
    .not('answered_at', 'is', null)
    .order('answered_at', { ascending: false })
  if (error) return { error: error.message, data: null }

  const responses = data as CSATResponse[]
  const nps = responses.filter((r) => r.type === 'nps')
  const csat = responses.filter((r) => r.type === 'csat')

  const npsScore = nps.length
    ? Math.round(
        ((nps.filter((r) => r.score >= 9).length - nps.filter((r) => r.score <= 6).length) / nps.length) * 100
      )
    : null

  const csatAvg = csat.length ? Math.round(csat.reduce((s, r) => s + r.score, 0) / csat.length * 10) / 10 : null

  return { error: null, data: { responses, npsScore, csatAvg } }
}

export interface CSATResponse {
  id: string
  type: 'csat' | 'nps'
  score: number
  comment: string | null
  respondent: string | null
  answered_at: string | null
  created_at: string
  project: { id: string; name: string } | null
}
