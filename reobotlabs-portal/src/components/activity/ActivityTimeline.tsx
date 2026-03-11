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
    <div className="relative space-y-5 before:absolute before:bottom-4 before:left-[18px] before:top-4 before:w-px before:bg-slate-200/70 sm:space-y-6 sm:before:left-5">
      {activities.map((activity) => {
        const config = ACTION_CONFIG[activity.action] ?? ACTION_CONFIG.created
        const Icon = config.icon

        return (
          <div key={activity.id} className="group relative pl-12 sm:pl-16">
            {/* Timeline dot/icon */}
            <div className={`absolute left-0 top-1 z-10 flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm transition-transform group-hover:scale-105 sm:h-11 sm:w-11 ${config.color}`}>
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>

            <div className="rounded-[24px] border border-white/80 bg-white/55 p-4 font-medium shadow-[0_20px_50px_rgba(15,23,42,0.04)] backdrop-blur-xl transition-all duration-300 hover:bg-white/70 hover:shadow-lg sm:rounded-[32px] sm:p-6">
              <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar
                      name={activity.user.full_name}
                      avatarUrl={activity.user.avatar_url}
                      size="sm"
                    />
                    <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-950 leading-none">
                      {activity.user.full_name}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1.5 font-bold uppercase tracking-wider">
                      {config.label}
                    </p>
                  </div>
                </div>
                <div className="w-fit rounded-full bg-slate-100/70 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 whitespace-nowrap">
                  {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: ptBR })}
                </div>
              </div>

              <div className="text-sm text-slate-600 leading-relaxed">
                {activity.action === 'status_changed' && (
                  <p>
                    Status alterado de <span className="font-bold text-slate-400 line-through decoration-slate-300/50">{STATUS_LABELS[activity.old_value ?? ''] ?? activity.old_value}</span> para{' '}
                    <span className="font-bold text-slate-950 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 ml-1">{STATUS_LABELS[activity.new_value ?? ''] ?? activity.new_value}</span>
                  </p>
                )}
                {activity.action === 'health_changed' && (
                  <p>
                    Saúde alterada de <span className={`font-bold ${HEALTH_CONFIG[activity.old_value ?? '']?.color ?? 'text-slate-400'}`}>
                      {HEALTH_CONFIG[activity.old_value ?? '']?.label ?? activity.old_value}
                    </span> para{' '}
                    <span className={`font-bold inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 ml-1 ${HEALTH_CONFIG[activity.new_value ?? '']?.color ?? 'text-slate-950'}`}>
                      {HEALTH_CONFIG[activity.new_value ?? '']?.label ?? activity.new_value}
                    </span>
                  </p>
                )}
                {activity.action === 'created' && (
                  <p>Projeto iniciado: <span className="font-bold text-slate-950">{activity.new_value}</span></p>
                )}
                {activity.action === 'phase_updated' && (
                  <p>Iniciou a fase <span className="font-bold text-slate-950">{activity.new_value}</span></p>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
