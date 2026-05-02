'use server'

import { createClient } from '@/lib/supabase/server'

type StandupTask = {
  id: string
  title: string
  status: string
  blocked_reason: string | null
  updated_at: string
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export async function generateDailyStandup() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Nao autenticado' }

  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

  const [{ data: tasks }, { data: todayEntries }, { data: runningTimer }] = await Promise.all([
    supabase
      .from('tasks')
      .select('id, title, status, blocked_reason, updated_at')
      .eq('assignee_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(80),
    supabase
      .from('time_entries')
      .select('hours, task:tasks(title)')
      .eq('user_id', user.id)
      .eq('entry_date', todayIso())
      .eq('is_running', false),
    supabase
      .from('time_entries')
      .select('started_at, task:tasks(title)')
      .eq('user_id', user.id)
      .eq('is_running', true)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const typedTasks = (tasks ?? []) as StandupTask[]
  const doneYesterday = typedTasks.filter((t) => t.status === 'done' && t.updated_at >= yesterday).slice(0, 6)
  const todayFocus = typedTasks
    .filter((t) => ['in_progress', 'todo', 'review'].includes(t.status))
    .slice(0, 6)
  const blockers = typedTasks.filter((t) => Boolean(t.blocked_reason?.trim())).slice(0, 4)

  const totalHoursToday = (todayEntries ?? []).reduce((acc, entry) => acc + Number(entry.hours ?? 0), 0)

  const lines: string[] = []
  lines.push(`Standup ${now.toLocaleDateString('pt-BR')}`)
  lines.push('')
  lines.push('Ontem:')
  if (doneYesterday.length === 0) {
    lines.push('- Sem entregas concluídas no último ciclo.')
  } else {
    doneYesterday.forEach((task) => lines.push(`- Concluí: ${task.title}`))
  }

  lines.push('')
  lines.push('Hoje:')
  if (todayFocus.length === 0) {
    lines.push('- Organizar backlog e puxar próxima tarefa prioritária.')
  } else {
    todayFocus.forEach((task) => lines.push(`- Vou focar em: ${task.title}`))
  }

  lines.push('')
  lines.push('Bloqueios:')
  if (blockers.length === 0) {
    lines.push('- Sem bloqueios no momento.')
  } else {
    blockers.forEach((task) =>
      lines.push(`- ${task.title}: ${task.blocked_reason}`),
    )
  }

  lines.push('')
  lines.push(`Horas registradas hoje: ${totalHoursToday.toFixed(2)}h`)
  if (runningTimer?.started_at) {
    const runningTitle = (runningTimer.task as { title?: string } | null)?.title ?? 'Tarefa em andamento'
    lines.push(`Timer ativo agora: ${runningTitle}`)
  }

  return { error: null, standup: lines.join('\n') }
}
