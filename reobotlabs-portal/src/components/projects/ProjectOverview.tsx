import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar, CheckCircle2, ClipboardCheck, Clock3, Target, Wallet } from 'lucide-react'
import { ChallengesBlock } from '@/components/dashboard/ChallengesBlock'
import { HealthBadge } from '@/components/dashboard/HealthBadge'
import { NextStepsBlock } from '@/components/dashboard/NextStepsBlock'
import { ProgressBar } from '@/components/dashboard/ProgressBar'
import type { Project } from '@/types'
import { ProjectTypeBadge } from './ProjectTypeBadge'
import { PublicPortalManagement } from './PublicPortalManagement'
import { ScopeDefinition } from './ScopeDefinition'

interface ProjectOverviewProps {
  project: Project
  isAdmin?: boolean
  publicPortalEnabledForPlan?: boolean
  metrics?: {
    pendingApprovals: number
    loggedHours: number
  }
}

function formatCurrency(value: number | null) {
  if (value == null) return '-'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value)
}

export function ProjectOverview({
  project,
  isAdmin,
  publicPortalEnabledForPlan = true,
  metrics,
}: ProjectOverviewProps) {
  const baselineGap = project.baseline_hours != null
    ? project.baseline_hours - (metrics?.loggedHours ?? 0)
    : null

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <ProjectTypeBadge type={project.type} />
            </div>
            <h2 className="text-lg font-bold text-foreground">{project.name}</h2>
            {project.description && (
              <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
            )}
          </div>
          <HealthBadge health={project.health} />
        </div>

        <ProgressBar value={project.progress_percent} className="mb-4" />

        <div className="grid grid-cols-2 gap-3">
          {project.start_date && (
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Inicio</p>
                <p className="text-xs font-medium text-foreground">
                  {format(new Date(project.start_date), "d 'de' MMM, yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>
          )}
          {project.target_end_date && (
            <div className="flex items-center gap-2">
              <Target className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Previsao</p>
                <p className="text-xs font-medium text-foreground">
                  {format(new Date(project.target_end_date), "d 'de' MMM, yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>
          )}
          {project.actual_end_date && (
            <div className="col-span-2 flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-400" />
              <div>
                <p className="text-xs text-muted-foreground">Concluido em</p>
                <p className="text-xs font-medium text-green-400">
                  {format(new Date(project.actual_end_date), "d 'de' MMM, yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock3 className="h-4 w-4" />
              <p className="text-xs uppercase tracking-wide">Horas logadas</p>
            </div>
            <p className="mt-3 text-2xl font-bold text-foreground">{(metrics?.loggedHours ?? 0).toFixed(1)}h</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Baseline {project.baseline_hours != null ? `${project.baseline_hours}h` : '-'}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ClipboardCheck className="h-4 w-4" />
              <p className="text-xs uppercase tracking-wide">Aprovacoes pendentes</p>
            </div>
            <p className="mt-3 text-2xl font-bold text-foreground">{metrics?.pendingApprovals ?? 0}</p>
            <p className="mt-1 text-xs text-muted-foreground">Itens aguardando cliente</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Wallet className="h-4 w-4" />
              <p className="text-xs uppercase tracking-wide">Contrato</p>
            </div>
            <p className="mt-3 text-2xl font-bold text-foreground">{formatCurrency(project.contract_value)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Margem alvo {project.margin_percent != null ? `${project.margin_percent}%` : '-'}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Target className="h-4 w-4" />
              <p className="text-xs uppercase tracking-wide">Saldo de baseline</p>
            </div>
            <p className={`mt-3 text-2xl font-bold ${baselineGap == null || baselineGap >= 0 ? 'text-foreground' : 'text-red-400'}`}>
              {baselineGap == null ? '-' : `${baselineGap > 0 ? '+' : ''}${baselineGap.toFixed(1)}h`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Baseline vs horas registradas</p>
          </div>
        </div>
      )}

      {isAdmin && (
        <PublicPortalManagement
          projectId={project.id}
          publicToken={project.public_token}
          publicEnabled={project.public_enabled}
          featureEnabled={publicPortalEnabledForPlan}
        />
      )}

      <NextStepsBlock content={project.next_steps} />
      <ChallengesBlock content={project.challenges} />
      <ScopeDefinition content={project.scope_definition} />
    </div>
  )
}
