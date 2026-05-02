import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock3, ListChecks, PlayCircle, CheckCircle2 } from 'lucide-react'
import { DailyStandupCard } from '@/components/dashboard/DailyStandupCard'

const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'A fazer',
  in_progress: 'Em andamento',
  review: 'Em revisao',
  done: 'Concluida',
  blocked: 'Bloqueada',
}

export default async function MyDayPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, status, due_date, project_id, projects(name)')
    .eq('assignee_id', user.id)
    .neq('status', 'done')
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(20)

  const { data: activeTimer } = await supabase
    .from('time_entries')
    .select('id, task_id, started_at, is_running, task:tasks(id, title, project_id)')
    .eq('user_id', user.id)
    .eq('is_running', true)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const total = tasks?.length ?? 0
  const dueToday = (tasks ?? []).filter((t) => t.due_date === new Date().toISOString().slice(0, 10)).length
  const inProgress = (tasks ?? []).filter((t) => t.status === 'in_progress').length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Meu Dia</h1>
          <p className="text-sm text-muted-foreground">Foco nas tarefas atribuídas a você e no timer ativo.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">Voltar ao dashboard</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-3xl font-bold">{total}</span>
            <ListChecks className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vencem Hoje</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-3xl font-bold">{dueToday}</span>
            <Clock3 className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em Andamento</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-3xl font-bold">{inProgress}</span>
            <PlayCircle className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      {activeTimer && (
        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-800">Timer Ativo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-emerald-900">
            <p className="font-semibold">{activeTimer.task?.title ?? 'Tarefa sem título'}</p>
            <p>Iniciado em: {new Date(activeTimer.started_at ?? '').toLocaleString('pt-BR')}</p>
            {activeTimer.task?.project_id && (
              <Button asChild size="sm" variant="outline" className="mt-2">
                <Link href={`/projects/${activeTimer.task.project_id}/tasks`}>Abrir projeto</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Minhas Tarefas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tasks && tasks.length > 0 ? (
            tasks.map((task) => (
              <div key={task.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{task.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Projeto: {task.projects?.name ?? 'Sem projeto'} {task.due_date ? `• Prazo: ${new Date(`${task.due_date}T12:00:00`).toLocaleDateString('pt-BR')}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{STATUS_LABELS[task.status] ?? task.status}</Badge>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/projects/${task.project_id}/tasks`}>Abrir</Link>
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Nenhuma tarefa pendente atribuída a você. <CheckCircle2 className="mx-auto mt-2 h-4 w-4" />
            </div>
          )}
        </CardContent>
      </Card>

      <DailyStandupCard />
    </div>
  )
}
