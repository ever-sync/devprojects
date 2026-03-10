'use client'

import {
  parseISO,
  differenceInDays,
  format,
  eachMonthOfInterval,
  startOfMonth,
  endOfMonth,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { ProjectPhase } from '@/types'

const PHASE_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-muted-foreground/40',
  in_progress: 'bg-blue-500/70',
  completed: 'bg-green-500/70',
  blocked: 'bg-red-500/70',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  in_progress: 'Em Andamento',
  completed: 'Concluído',
  blocked: 'Bloqueado',
}

export function GanttView({ phases }: { phases: ProjectPhase[] }) {
  const dates = phases
    .flatMap((p) => [p.estimated_start, p.estimated_end, p.actual_start, p.actual_end])
    .filter(Boolean) as string[]

  if (dates.length === 0) {
    return (
      <div className="rounded-lg border border-border/50 bg-card/50 py-12 text-center text-sm text-muted-foreground">
        Nenhuma fase possui datas definidas para exibir o Gantt.
      </div>
    )
  }

  const minDate = dates.reduce((a, b) => (a < b ? a : b))
  const maxDate = dates.reduce((a, b) => (a > b ? a : b))
  const ganttStart = parseISO(minDate)
  const ganttEnd = parseISO(maxDate)
  const totalDays = Math.max(differenceInDays(ganttEnd, ganttStart) + 1, 1)

  const months = eachMonthOfInterval({ start: ganttStart, end: ganttEnd })

  function pct(days: number) {
    return `${(days / totalDays) * 100}%`
  }

  const today = new Date()
  const todayOffset = differenceInDays(today, ganttStart)
  const showToday = todayOffset >= 0 && todayOffset <= totalDays

  return (
    <div className="mt-4 overflow-x-auto">
      <div style={{ minWidth: '640px' }}>
        {/* Month headers */}
        <div className="flex ml-48 border-b border-border pb-1 mb-1">
          {months.map((month) => {
            const mStart = startOfMonth(month)
            const mEnd = endOfMonth(month)
            const clampedStart = mStart < ganttStart ? ganttStart : mStart
            const clampedEnd = mEnd > ganttEnd ? ganttEnd : mEnd
            const w = ((differenceInDays(clampedEnd, clampedStart) + 1) / totalDays) * 100
            return (
              <div
                key={month.toISOString()}
                style={{ width: `${w}%` }}
                className="text-xs text-muted-foreground px-1 shrink-0 truncate"
              >
                {format(month, 'MMM yy', { locale: ptBR })}
              </div>
            )
          })}
        </div>

        {/* Phase rows */}
        <div className="space-y-2">
          {phases.map((phase) => {
            const startStr = phase.actual_start ?? phase.estimated_start
            const endStr = phase.actual_end ?? phase.estimated_end
            const hasBar = startStr && endStr

            let barLeft = 0
            let barWidth = 0
            if (hasBar) {
              const s = differenceInDays(parseISO(startStr), ganttStart)
              const e = differenceInDays(parseISO(endStr), ganttStart) + 1
              barLeft = Math.max(s, 0)
              barWidth = Math.max(e - barLeft, 1)
            }

            const color = PHASE_STATUS_COLORS[phase.status] ?? 'bg-muted-foreground/40'

            return (
              <div key={phase.id} className="flex items-center">
                <div className="w-48 shrink-0 pr-3">
                  <p
                    className="text-xs font-medium text-foreground truncate"
                    title={phase.name}
                  >
                    {phase.name}
                  </p>
                </div>
                <div className="flex-1 relative h-7 rounded border border-border/30 bg-card/50">
                  {hasBar && (
                    <div
                      className={`absolute top-1.5 bottom-1.5 rounded ${color}`}
                      style={{ left: pct(barLeft), width: pct(barWidth) }}
                      title={`${startStr} → ${endStr}`}
                    />
                  )}
                  {showToday && (
                    <div
                      className="absolute top-0 bottom-0 w-px bg-primary/70"
                      style={{ left: pct(todayOffset) }}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-5 flex-wrap">
          {Object.entries(PHASE_STATUS_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`h-2.5 w-5 rounded-sm ${color}`} />
              {STATUS_LABELS[status]}
            </div>
          ))}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-4 w-0.5 bg-primary/70 inline-block" />
            Hoje
          </div>
        </div>
      </div>
    </div>
  )
}
