import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { HealthBadge } from './HealthBadge'
import { ProgressBar } from './ProgressBar'
import { ProjectTypeBadge } from '@/components/projects/ProjectTypeBadge'
import type { Project, Client } from '@/types'
import { differenceInDays, format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowUpRight, CalendarDays, Clock3, FolderKanban } from 'lucide-react'

interface ProjectCardProps {
  project: Project & { clients?: Pick<Client, 'name'> | null }
  showClient?: boolean
  pendingClientTasks?: number
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: {
    label: 'Ativo',
    className: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  },
  paused: {
    label: 'Pausado',
    className: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
  },
  completed: {
    label: 'Concluido',
    className: 'border-sky-500/25 bg-sky-500/10 text-sky-300',
  },
  cancelled: {
    label: 'Cancelado',
    className: 'border-rose-500/25 bg-rose-500/10 text-rose-300',
  },
}

export function ProjectCard({ project, showClient = false, pendingClientTasks }: ProjectCardProps) {
  const daysLeft = project.target_end_date
    ? differenceInDays(new Date(project.target_end_date), new Date())
    : null

  const status = STATUS_CONFIG[project.status] ?? {
    label: project.status,
    className: 'border-border bg-secondary text-muted-foreground',
  }

  const updatedLabel = formatDistanceToNow(new Date(project.updated_at), {
    addSuffix: true,
    locale: ptBR,
  })

  return (
    <Link href={`/projects/${project.id}`} className="block h-full">
      <Card className="group relative h-full cursor-pointer overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.94))] shadow-[0_14px_30px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_22px_44px_rgba(15,23,42,0.14)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_58%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_48%)] opacity-80 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400 via-primary to-cyan-300" />

        <CardContent className="relative p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <ProjectTypeBadge type={project.type} />
                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${status.className}`}>
                  {status.label}
                </span>
                {showClient && project.clients?.name && (
                  <span className="inline-flex items-center rounded-full border border-black/5 bg-white/70 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                    {project.clients.name}
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <h3 className="line-clamp-2 text-base font-semibold leading-tight tracking-[-0.02em] text-slate-900">
                  {project.name}
                </h3>
                {project.description && (
                  <p className="line-clamp-2 text-sm leading-5 text-slate-600">
                    {project.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2">
              <HealthBadge health={project.health} size="sm" />
              <span className="rounded-full bg-slate-950/5 p-2 text-slate-500 transition-colors duration-300 group-hover:bg-primary/10 group-hover:text-primary">
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </div>
          </div>

          <div className="mb-4 rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FolderKanban className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500">
                    Andamento
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {project.progress_percent}% concluido
                  </p>
                </div>
              </div>
              <span className="text-xs font-medium text-slate-500">
                {project.progress_percent < 30 ? 'Inicio' : project.progress_percent < 80 ? 'Em execucao' : 'Fase final'}
              </span>
            </div>

            <ProgressBar value={project.progress_percent} showLabel={false} />
          </div>

          {typeof pendingClientTasks === 'number' && pendingClientTasks > 0 && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs">
              <span className="h-2 w-2 shrink-0 rounded-full bg-yellow-500" />
              <span className="font-medium text-amber-700">
                {pendingClientTasks} tarefa{pendingClientTasks > 1 ? 's' : ''} aguardando aprovacao
              </span>
            </div>
          )}

          <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5">
              <div className="mb-1 flex items-center gap-1.5 text-slate-500">
                <CalendarDays className="h-3.5 w-3.5" />
                <span>Previsao</span>
              </div>
              {project.target_end_date ? (
                <>
                  <p className="font-semibold text-slate-900">
                    {format(new Date(project.target_end_date), "d 'de' MMM, yyyy", { locale: ptBR })}
                  </p>
                  {daysLeft !== null && (
                    <p className={`mt-0.5 font-medium ${daysLeft < 0 ? 'text-rose-500' : daysLeft <= 7 ? 'text-amber-500' : 'text-slate-500'}`}>
                      {daysLeft < 0
                        ? `${Math.abs(daysLeft)}d atrasado`
                        : daysLeft === 0
                        ? 'Entrega hoje'
                        : `${daysLeft}d restantes`}
                    </p>
                  )}
                </>
              ) : (
                <p className="font-medium text-slate-400">Sem prazo definido</p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5">
              <div className="mb-1 flex items-center gap-1.5 text-slate-500">
                <Clock3 className="h-3.5 w-3.5" />
                <span>Ultima atualizacao</span>
              </div>
              <p className="font-semibold text-slate-900">
                {format(new Date(project.updated_at), "d 'de' MMM", { locale: ptBR })}
              </p>
              <p className="mt-0.5 font-medium text-slate-500">
                {updatedLabel}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
