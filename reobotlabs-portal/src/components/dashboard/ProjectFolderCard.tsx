import type { ElementType } from 'react'
import Link from 'next/link'
import { differenceInDays } from 'date-fns'
import { ArrowRight, ListTodo, GitBranch, Bot, Boxes, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Project, Client } from '@/types'

type ProjectWithClient = Project & { clients?: Pick<Client, 'name'> | null }

const TYPE_CONFIG: Record<string, { label: string; gradient: string; iconBg: string; Icon: ElementType }> = {
  saas: {
    label: 'SaaS',
    gradient: 'from-[#0f172a] to-[#19332f]',
    iconBg: 'bg-white/15',
    Icon: Boxes,
  },
  automation: {
    label: 'Automação',
    gradient: 'from-[#0f172a] to-[#204740]',
    iconBg: 'bg-white/15',
    Icon: GitBranch,
  },
  ai_agent: {
    label: 'Agente de IA',
    gradient: 'from-[#0f172a] to-[#25EBCD]',
    iconBg: 'bg-white/15',
    Icon: Bot,
  },
}

const HEALTH_DOTS: Record<string, string> = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-400',
  red: 'bg-red-500',
}

interface ProjectFolderCardProps {
  project: ProjectWithClient
}

export function ProjectFolderCard({ project }: ProjectFolderCardProps) {
  const config = TYPE_CONFIG[project.type] ?? TYPE_CONFIG.saas
  const { Icon } = config

  const daysLeft = project.target_end_date
    ? differenceInDays(new Date(project.target_end_date), new Date())
    : null

  const isOverdue = daysLeft !== null && daysLeft < 0

  return (
    <div className="flex-shrink-0 w-[272px] flex flex-col">
      {/* Folder tab */}
      <div className="ml-4 w-16 h-3 bg-card border border-b-0 border-border rounded-t-lg" />

      {/* Card body */}
      <div className="overflow-hidden rounded-2xl rounded-tl-none border border-border bg-white shadow-[0_6px_18px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
        {/* Colored header band */}
        <div className={cn('relative flex h-24 items-center justify-center bg-gradient-to-r', config.gradient)}>
          <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center', config.iconBg)}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          {/* Type pill */}
          <span className="absolute top-3 right-3 text-[10px] font-semibold bg-black/20 text-white px-2 py-0.5 rounded-full">
            {config.label}
          </span>
          {/* Days pill */}
          {daysLeft !== null && (
            <span className={cn(
              'absolute bottom-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1',
              isOverdue ? 'bg-red-500/90 text-white' : 'bg-black/20 text-white',
            )}>
              <Clock className="w-2.5 h-2.5" />
              {isOverdue ? `${Math.abs(daysLeft)}d atraso` : `${daysLeft}d restantes`}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Name + client */}
          <h3 className="font-bold text-foreground text-sm leading-snug mb-0.5 truncate">
            {project.name}
          </h3>
          {project.clients?.name && (
            <p className="text-xs text-muted-foreground mb-3 truncate">{project.clients.name}</p>
          )}

          {/* Health + progress */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5">
              {['green', 'yellow', 'red'].map((h) => (
                <span
                  key={h}
                  className={cn(
                    'w-2.5 h-2.5 rounded-full transition-opacity',
                    HEALTH_DOTS[h],
                    project.health !== h && 'opacity-20',
                  )}
                />
              ))}
              <span className="text-xs text-muted-foreground ml-1">
                {project.health === 'green' ? 'No prazo' : project.health === 'yellow' ? 'Atenção' : 'Crítico'}
              </span>
            </div>
            <span className="text-xs font-semibold text-foreground">{project.progress_percent ?? 0}%</span>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-secondary rounded-full mb-4 overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', `bg-gradient-to-r ${config.gradient}`)}
              style={{ width: `${project.progress_percent ?? 0}%` }}
            />
          </div>

          {/* Action links */}
          <div className="flex items-center gap-3 border-t border-border pt-3">
            <Link
              href={`/projects/${project.id}`}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Abrir <ArrowRight className="w-3 h-3" />
            </Link>
            <span className="text-border">|</span>
            <Link
              href={`/projects/${project.id}/tasks`}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <ListTodo className="w-3 h-3" />
              Tarefas
            </Link>
            <Link
              href={`/projects/${project.id}/timeline`}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <GitBranch className="w-3 h-3" />
              Timeline
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

