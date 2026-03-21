import { PHASE_STATUS_CONFIG } from '@/lib/constants'
import type { ProjectPhase } from '@/types'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface PhaseCardProps {
  phase: ProjectPhase
  index: number
}

export function PhaseCard({ phase, index }: PhaseCardProps) {
  const config = PHASE_STATUS_CONFIG[phase.status]

  const statusColors = {
    pending: 'bg-secondary/50 border-border',
    in_progress: 'bg-blue-500/10 border-blue-500/20',
    completed: 'bg-green-500/10 border-green-500/20',
    blocked: 'bg-red-500/10 border-red-500/20',
  }

  const dotColors = {
    pending: 'bg-muted-foreground',
    in_progress: 'bg-blue-500',
    completed: 'bg-green-500',
    blocked: 'bg-red-500',
  }

  const statusKey = phase.status as keyof typeof statusColors

  return (
    <div className={`rounded-xl border p-4 ${statusColors[statusKey]}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center mt-1">
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dotColors[statusKey]}`} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-muted-foreground font-medium">Fase {index + 1}</span>
              <span className={`text-xs font-semibold ${config.color}`}>● {config.label}</span>
            </div>
            <h4 className="font-semibold text-foreground text-sm">{phase.name}</h4>
            {phase.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{phase.description}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        {phase.estimated_start && (
          <div>
            <p className="text-muted-foreground mb-0.5">Início Estimado</p>
            <p className="font-medium text-foreground">
              {format(parseISO(phase.estimated_start), "d 'de' MMM", { locale: ptBR })}
            </p>
          </div>
        )}
        {phase.estimated_end && (
          <div>
            <p className="text-muted-foreground mb-0.5">Fim Estimado</p>
            <p className="font-medium text-foreground">
              {format(parseISO(phase.estimated_end), "d 'de' MMM", { locale: ptBR })}
            </p>
          </div>
        )}
        {phase.actual_start && (
          <div>
            <p className="text-muted-foreground mb-0.5">Início Real</p>
            <p className="font-medium text-foreground">
              {format(parseISO(phase.actual_start), "d 'de' MMM", { locale: ptBR })}
            </p>
          </div>
        )}
        {phase.actual_end && (
          <div>
            <p className="text-muted-foreground mb-0.5">Fim Real</p>
            <p className="font-medium text-green-400">
              {format(parseISO(phase.actual_end), "d 'de' MMM", { locale: ptBR })}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
