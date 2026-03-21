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

interface PhaseStyle {
  bar: string
  track: string
  dot: string
  label: string
}

const PHASE_STYLES: Record<string, PhaseStyle> = {
  pending: {
    bar: 'bg-slate-300/80',
    track: 'bg-slate-100/60',
    dot: 'bg-slate-400',
    label: 'text-slate-500',
  },
  in_progress: {
    bar: 'bg-gradient-to-r from-blue-500 to-blue-400',
    track: 'bg-blue-50/60',
    dot: 'bg-blue-500',
    label: 'text-blue-700',
  },
  completed: {
    bar: 'bg-gradient-to-r from-emerald-500 to-emerald-400',
    track: 'bg-emerald-50/60',
    dot: 'bg-emerald-500',
    label: 'text-emerald-700',
  },
  blocked: {
    bar: 'bg-gradient-to-r from-rose-500 to-rose-400',
    track: 'bg-rose-50/60',
    dot: 'bg-rose-500',
    label: 'text-rose-700',
  },
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  in_progress: 'Em Andamento',
  completed: 'Concluído',
  blocked: 'Bloqueado',
}

const STATUS_ORDER = ['pending', 'in_progress', 'completed', 'blocked']

export function GanttView({ phases }: { phases: ProjectPhase[] }) {
  const dates = phases
    .flatMap((p) => [p.estimated_start, p.estimated_end, p.actual_start, p.actual_end])
    .filter(Boolean) as string[]

  if (dates.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/60 bg-slate-50/80 py-14 text-center">
        <p className="text-sm text-slate-400">Nenhuma fase possui datas definidas para exibir o Gantt.</p>
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
    <div className="mt-6 space-y-5">
      <div className="space-y-3 lg:hidden">
        {phases.map((phase) => {
          const startStr = phase.actual_start ?? phase.estimated_start
          const endStr = phase.actual_end ?? phase.estimated_end
          const styles = PHASE_STYLES[phase.status] ?? PHASE_STYLES.pending
          const hasDates = Boolean(startStr || endStr)

          return (
            <div key={phase.id} className="rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">{phase.name}</p>
                  <p className={`mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${styles.label}`}>
                    {STATUS_LABELS[phase.status]}
                  </p>
                </div>
                <span className={`mt-0.5 h-3 w-3 shrink-0 rounded-full ${styles.dot}`} />
              </div>

              <div className="mt-4 space-y-3">
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${styles.bar}`} style={{ width: hasDates ? '100%' : '35%' }} />
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs text-slate-500">
                  <div className="rounded-2xl bg-slate-50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Inicio</p>
                    <p className="mt-1 font-medium text-slate-700">
                      {startStr ? format(parseISO(startStr), "d 'de' MMM", { locale: ptBR }) : 'A definir'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Fim</p>
                    <p className="mt-1 font-medium text-slate-700">
                      {endStr ? format(parseISO(endStr), "d 'de' MMM", { locale: ptBR }) : 'A definir'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="hidden overflow-x-auto rounded-[32px] border border-white/80 bg-white/35 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl lg:block">
      <div style={{ minWidth: '720px' }}>
        {/* Month header row */}
        <div className="mb-6 flex pl-52">
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
                className="shrink-0 truncate px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400"
              >
                {format(month, 'MMM yy', { locale: ptBR })}
              </div>
            )
          })}
        </div>

        {/* Phase rows */}
        <div className="space-y-4">
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

            const styles = PHASE_STYLES[phase.status] ?? PHASE_STYLES.pending

            return (
              <div
                key={phase.id}
                className="group flex items-center gap-4 rounded-3xl p-2 transition-all duration-300 hover:bg-white/40"
              >
                {/* Phase name */}
                <div className="flex w-48 shrink-0 items-center gap-3 pr-4">
                  <div className={`h-11 w-11 shrink-0 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm transition-transform group-hover:scale-110`}>
                    <span className={`h-2.5 w-2.5 rounded-full ${styles.dot} shadow-sm`} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-950 tracking-tight" title={phase.name}>
                      {phase.name}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      {STATUS_LABELS[phase.status]}
                    </p>
                  </div>
                </div>

                {/* Gantt track */}
                <div className="relative flex-1" style={{ height: '40px' }}>
                  {/* Month grid lines */}
                  {months.map((month) => {
                    const mStart = startOfMonth(month)
                    const offset = differenceInDays(mStart, ganttStart)
                    if (offset <= 0) return null
                    return (
                      <div
                        key={month.toISOString()}
                        className="absolute top-0 bottom-0 w-px bg-slate-200/40"
                        style={{ left: pct(offset) }}
                      />
                    )
                  })}

                  {/* Track background */}
                  <div className="absolute inset-y-[8px] inset-x-0 rounded-full bg-slate-100/60" />

                  {/* Progress bar */}
                  {hasBar && (
                    <div
                      className={`absolute inset-y-[8px] rounded-full shadow-lg ${styles.bar} transition-all duration-500`}
                      style={{ left: pct(barLeft), width: pct(barWidth) }}
                      title={`${startStr} → ${endStr}`}
                    >
                      <div className="absolute inset-0 rounded-full bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-size-[250%_250%] animate-shimmer" />
                    </div>
                  )}

                  {/* Today marker */}
                  {showToday && (
                    <div
                      className="absolute top-0 bottom-0 flex flex-col items-center"
                      style={{ left: pct(todayOffset) }}
                    >
                      <div className="h-full w-0.5 bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.6)] z-20" />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-slate-200/60 pt-8">
          {STATUS_ORDER.map((status) => {
            const styles = PHASE_STYLES[status]
            return (
              <div key={status} className="flex items-center gap-3">
                <span className={`h-3 w-8 rounded-full ${styles.bar} shadow-sm`} />
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">{STATUS_LABELS[status]}</span>
              </div>
            )
          })}
          <div className="flex items-center gap-3">
            <span className="h-5 w-0.5 rounded-full bg-sky-500" />
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Hoje</span>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
