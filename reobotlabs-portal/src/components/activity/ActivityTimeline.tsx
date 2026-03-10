'use client'

import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CheckCircle2,
  RefreshCw,
  PlusCircle,
  AlertTriangle,
  History,
  type LucideIcon,
} from 'lucide-react'
import type { ActivityWithUser } from '@/actions/activities'
import { Avatar } from '@/components/shared/Avatar'
import { HEALTH_CONFIG } from '@/lib/constants'

interface ActivityTimelineProps {
  activities: ActivityWithUser[]
}

const ACTION_CONFIG: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  status_changed: { icon: RefreshCw, color: 'text-blue-400', label: 'Status alterado' },
  health_changed: { icon: AlertTriangle, color: 'text-yellow-400', label: 'Saúde alterada' },
  phase_updated: { icon: CheckCircle2, color: 'text-green-400', label: 'Fase atualizada' },
  created: { icon: PlusCircle, color: 'text-primary', label: 'Projeto criado' },
  deleted: { icon: History, color: 'text-red-400', label: 'Removido' },
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  paused: 'Pausado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (activities.length === 0) return null

  return (
    <div className="space-y-6 relative before:absolute before:inset-0 before:left-5 before:w-px before:bg-border before:mt-2 before:mb-2">
      {activities.map((activity) => {
        const config = ACTION_CONFIG[activity.action] ?? ACTION_CONFIG.created
        const Icon = config.icon

        return (
          <div key={activity.id} className="relative pl-12">
            {/* Timeline dot/icon */}
            <div className={`absolute left-0 top-0.5 w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center z-10 ${config.color}`}>
              <Icon className="w-5 h-5" />
            </div>

            <div className="bg-card/50 border border-border/50 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-2">
                  <Avatar
                    name={activity.user.full_name}
                    avatarUrl={activity.user.avatar_url}
                    size="sm"
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground leading-none">
                      {activity.user.full_name}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {config.label} • {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                {activity.action === 'status_changed' && (
                  <p>
                    De <span className="font-medium text-foreground">{STATUS_LABELS[activity.old_value ?? ''] ?? activity.old_value}</span> para{' '}
                    <span className="font-medium text-primary">{STATUS_LABELS[activity.new_value ?? ''] ?? activity.new_value}</span>
                  </p>
                )}
                {activity.action === 'health_changed' && (
                  <p>
                    De <span className={HEALTH_CONFIG[activity.old_value ?? '']?.color ?? 'text-foreground'}>
                      {HEALTH_CONFIG[activity.old_value ?? '']?.label ?? activity.old_value}
                    </span> para{' '}
                    <span className={HEALTH_CONFIG[activity.new_value ?? '']?.color ?? 'text-primary'}>
                      {HEALTH_CONFIG[activity.new_value ?? '']?.label ?? activity.new_value}
                    </span>
                  </p>
                )}
                {activity.action === 'created' && (
                  <p>Projeto iniciado: <span className="font-semibold text-foreground">{activity.new_value}</span></p>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
