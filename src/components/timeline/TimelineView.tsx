'use client'

import { useTransition } from 'react'
import { PhaseForm } from './PhaseForm'
import { EmptyState } from '@/components/shared/EmptyState'
import { GitBranch, Clock, Play, CheckCircle, AlertCircle, ChevronUp, ChevronDown } from 'lucide-react'
import type { ProjectPhase } from '@/types'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { PHASE_STATUS_CONFIG } from '@/lib/constants'
import { reorderPhase } from '@/actions/phases'
import { useRouter } from 'next/navigation'

interface TimelineViewProps {
  phases: ProjectPhase[]
  projectId: string
  isAdmin: boolean
}

const STATUS_ICON = {
  pending: Clock,
  in_progress: Play,
  completed: CheckCircle,
  blocked: AlertCircle,
}

const STATUS_CIRCLE = {
  pending: 'bg-secondary border-border text-muted-foreground',
  in_progress: 'bg-blue-500/15 border-blue-500/40 text-blue-400',
  completed: 'bg-green-500/15 border-green-500/40 text-green-400',
  blocked: 'bg-red-500/15 border-red-500/40 text-red-400',
}

const STATUS_LINE = {
  pending: 'bg-border',
  in_progress: 'bg-blue-500/30',
  completed: 'bg-green-500/40',
  blocked: 'bg-red-500/30',
}

const STATUS_BADGE = {
  pending: 'bg-secondary text-muted-foreground',
  in_progress: 'bg-blue-500/15 text-blue-400',
  completed: 'bg-green-500/15 text-green-400',
  blocked: 'bg-red-500/15 text-red-400',
}

const STATUS_CARD = {
  pending: 'bg-card border-border',
  in_progress: 'bg-blue-500/5 border-blue-500/25',
  completed: 'bg-green-500/5 border-green-500/25',
  blocked: 'bg-red-500/5 border-red-500/25',
}

function phaseDate(phase: ProjectPhase): string | null {
  const d = phase.actual_start ?? phase.estimated_start
  if (!d) return null
  return format(parseISO(d), "d MMM", { locale: ptBR })
}

interface PhaseRowProps {
  phase: ProjectPhase
  prev: ProjectPhase | null
  next: ProjectPhase | null
  index: number
  isLast: boolean
  isAdmin: boolean
  projectId: string
}

function PhaseRow({ phase, prev, next, index, isLast, isAdmin, projectId }: PhaseRowProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const statusKey = phase.status as keyof typeof STATUS_ICON
  const Icon = STATUS_ICON[statusKey] ?? Clock
  const config = PHASE_STATUS_CONFIG[statusKey]
  const date = phaseDate(phase)

  function move(neighbor: ProjectPhase) {
    startTransition(async () => {
      await reorderPhase(
        phase.id,
        neighbor.id,
        phase.order_index,
        neighbor.order_index,
        projectId
      )
      router.refresh()
    })
  }

  return (
    <div className={`flex gap-0 transition-opacity ${isPending ? 'opacity-60' : ''}`}>
      {/* Left: date */}
      <div className="w-14 shrink-0 pt-2.5 text-right pr-3">
        {date ? (
          <span className="text-[11px] text-muted-foreground leading-tight whitespace-nowrap">
            {date}
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground/30">—</span>
        )}
      </div>

      {/* Center: icon + vertical line */}
      <div className="flex flex-col items-center shrink-0 w-9">
        <div
          className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 z-10 ${STATUS_CIRCLE[statusKey]}`}
        >
          <Icon className="w-4 h-4" />
        </div>
        {!isLast && (
          <div className={`w-0.5 flex-1 min-h-6 my-1 rounded-full ${STATUS_LINE[statusKey]}`} />
        )}
      </div>

      {/* Right: card */}
      <div className="flex-1 pb-5 pl-3 pt-1">
        <div className={`border rounded-xl p-3.5 relative ${STATUS_CARD[statusKey]}`}>
          {/* Admin actions: move + edit */}
          {isAdmin && (
            <div className="absolute top-2 right-2 flex items-center gap-0.5">
              <button
                type="button"
                disabled={!prev || isPending}
                onClick={() => prev && move(prev)}
                className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                title="Mover para cima"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={!next || isPending}
                onClick={() => next && move(next)}
                className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                title="Mover para baixo"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <PhaseForm projectId={projectId} phase={phase} />
            </div>
          )}

          <div className="flex items-start gap-2 flex-wrap pr-20">
            <span className="text-[10px] text-muted-foreground font-medium">Fase {index + 1}</span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_BADGE[statusKey]}`}>
              {config?.label}
            </span>
          </div>

          <h4 className="font-semibold text-sm text-foreground mt-1">{phase.name}</h4>

          {phase.description && (
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{phase.description}</p>
          )}

          {/* Dates */}
          {(phase.estimated_start || phase.estimated_end || phase.actual_start || phase.actual_end) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 pt-2.5 border-t border-border/40">
              {phase.estimated_start && (
                <div className="text-[11px]">
                  <span className="text-muted-foreground">Início est. </span>
                  <span className="font-medium text-foreground">
                    {format(parseISO(phase.estimated_start), "d 'de' MMM", { locale: ptBR })}
                  </span>
                </div>
              )}
              {phase.estimated_end && (
                <div className="text-[11px]">
                  <span className="text-muted-foreground">Fim est. </span>
                  <span className="font-medium text-foreground">
                    {format(parseISO(phase.estimated_end), "d 'de' MMM", { locale: ptBR })}
                  </span>
                </div>
              )}
              {phase.actual_start && (
                <div className="text-[11px]">
                  <span className="text-muted-foreground">Início real </span>
                  <span className="font-medium text-foreground">
                    {format(parseISO(phase.actual_start), "d 'de' MMM", { locale: ptBR })}
                  </span>
                </div>
              )}
              {phase.actual_end && (
                <div className="text-[11px]">
                  <span className="text-muted-foreground">Fim real </span>
                  <span className="font-medium text-green-400">
                    {format(parseISO(phase.actual_end), "d 'de' MMM", { locale: ptBR })}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function TimelineView({ phases, projectId, isAdmin }: TimelineViewProps) {
  if (phases.length === 0) {
    return (
      <EmptyState
        icon={<GitBranch className="w-12 h-12" />}
        title="Nenhuma fase definida"
        description="As fases são criadas automaticamente ao criar um projeto, ou você pode adicionar manualmente."
        action={isAdmin ? <PhaseForm projectId={projectId} orderIndex={0} /> : undefined}
      />
    )
  }

  return (
    <div className="space-y-0">
      {phases.map((phase, index) => (
        <PhaseRow
          key={phase.id}
          phase={phase}
          prev={index > 0 ? phases[index - 1] : null}
          next={index < phases.length - 1 ? phases[index + 1] : null}
          index={index}
          isLast={index === phases.length - 1}
          isAdmin={isAdmin}
          projectId={projectId}
        />
      ))}

      {isAdmin && (
        <div className="flex gap-0">
          <div className="w-14 shrink-0" />
          <div className="w-9 shrink-0" />
          <div className="flex-1 pl-3 pt-1">
            <PhaseForm projectId={projectId} orderIndex={phases.length} />
          </div>
        </div>
      )}
    </div>
  )
}
