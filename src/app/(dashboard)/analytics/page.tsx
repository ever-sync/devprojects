import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  FolderKanban,
  ShieldAlert,
  TrendingUp,
  Users,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getAdminAnalytics } from '@/actions/analytics'
import {
  getIndividualPerformanceDataFiltered,
  getPortfolioProfitabilityDataFiltered,
} from '@/actions/margin'
import type { ActivityWithUser } from '@/actions/activities'
import { ActivityTimeline } from '@/components/activity/ActivityTimeline'
import { AnalyticsCharts } from '@/components/analytics/AnalyticsCharts'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function scoreStyles(score: number) {
  if (score >= 80) return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
  if (score >= 55) return 'bg-amber-500/10 text-amber-600 border-amber-500/20'
  return 'bg-red-500/10 text-red-600 border-red-500/20'
}

interface AnalyticsPageProps {
  searchParams: Promise<{ period?: string; client?: string; type?: string }>
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const params = await searchParams
  const rawPeriod = Number(params.period ?? 30)
  const selectedPeriod = [7, 30, 90].includes(rawPeriod) ? rawPeriod : 30
  const selectedClient = params.client?.trim() || ''
  const selectedType = params.type?.trim() || ''
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('plans(key)')

  const hasAdvancedAnalytics = (subscriptions ?? []).some((subscription) => {
    const plan = (subscription as { plans: { key: string } | null }).plans
    return plan?.key === 'scale'
  })

  if (!hasAdvancedAnalytics) {
    return (
      <div>
        <PageHeader
          title="Admin Analytics"
          description="Performance, saude operacional e previsibilidade da carteira"
        />
        <EmptyState
          icon={<ShieldAlert className="h-12 w-12" />}
          title="Analytics avancado bloqueado"
          description="Esse modulo esta disponivel apenas para workspaces no plano Scale."
        />
      </div>
    )
  }

  const stats = await getAdminAnalytics(selectedPeriod, {
    clientName: selectedClient || null,
    projectType: selectedType || null,
  })
  const profitability = await getPortfolioProfitabilityDataFiltered(selectedPeriod, {
    client: selectedClient || null,
    projectType: selectedType || null,
  })
  const individualPerformance = await getIndividualPerformanceDataFiltered(selectedPeriod, {
    client: selectedClient || null,
    projectType: selectedType || null,
  })
  const filterClients = Array.from(
    new Set(profitability.data.map((item) => item.clientName).filter((item): item is string => Boolean(item))),
  ).sort((a, b) => a.localeCompare(b))
  const filterTypes = Array.from(
    new Set(stats.projectHealth.map((item) => item.type).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b))
  const criticalMarginProjects = profitability.data
    .filter((item) => item.marginRisk === 'critical')
    .sort((a, b) => (a.marginGapToTarget ?? Number.POSITIVE_INFINITY) - (b.marginGapToTarget ?? Number.POSITIVE_INFINITY))
    .slice(0, 5)

  const currency = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  })

  const cards = [
    {
      title: 'Total projetos',
      value: stats.kpis.totalProjects,
      icon: FolderKanban,
      color: 'text-sky-600',
      bg: 'bg-sky-500/10',
    },
    {
      title: 'Total clientes',
      value: stats.kpis.totalClients,
      icon: Users,
      color: 'text-cyan-600',
      bg: 'bg-cyan-500/10',
    },
    {
      title: 'Total tarefas',
      value: stats.kpis.totalTasks,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-500/10',
    },
    {
      title: 'Eficiencia global',
      value: `${stats.kpis.globalEfficiency}%`,
      icon: TrendingUp,
      color: 'text-orange-600',
      bg: 'bg-orange-500/10',
    },
    {
      title: 'Health score medio',
      value: stats.kpis.avgHealthScore,
      icon: ShieldAlert,
      color: 'text-violet-600',
      bg: 'bg-violet-500/10',
    },
    {
      title: 'Projetos em risco',
      value: stats.kpis.atRiskProjects,
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-500/10',
    },
  ]

  if (stats.kpis.totalProjects === 0) {
    return (
      <div>
        <PageHeader
          title="Admin Analytics"
          description="Visao geral de performance e metricas do portal"
        />
        <EmptyState
          icon={<FolderKanban className="h-12 w-12" />}
          title="Sem dados ainda"
          description="Crie projetos e cadastre clientes para ver as metricas aqui."
          action={
            <Button asChild size="sm">
              <Link href="/projects/new">Criar primeiro projeto</Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin Analytics"
        description="Performance, saude operacional e previsibilidade da carteira"
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Periodo:</span>
        {[7, 30, 90].map((days) => (
          <Button key={days} asChild size="sm" variant={selectedPeriod === days ? 'secondary' : 'outline'}>
            <Link href={`/analytics?period=${days}${selectedClient ? `&client=${encodeURIComponent(selectedClient)}` : ''}${selectedType ? `&type=${encodeURIComponent(selectedType)}` : ''}`}>{days} dias</Link>
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Cliente:</span>
        <Button asChild size="sm" variant={selectedClient ? 'outline' : 'secondary'}>
          <Link href={`/analytics?period=${selectedPeriod}${selectedType ? `&type=${encodeURIComponent(selectedType)}` : ''}`}>Todos</Link>
        </Button>
        {filterClients.slice(0, 8).map((clientName) => (
          <Button key={clientName} asChild size="sm" variant={selectedClient === clientName ? 'secondary' : 'outline'}>
            <Link href={`/analytics?period=${selectedPeriod}&client=${encodeURIComponent(clientName)}${selectedType ? `&type=${encodeURIComponent(selectedType)}` : ''}`}>
              {clientName}
            </Link>
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Tipo:</span>
        <Button asChild size="sm" variant={selectedType ? 'outline' : 'secondary'}>
          <Link href={`/analytics?period=${selectedPeriod}${selectedClient ? `&client=${encodeURIComponent(selectedClient)}` : ''}`}>Todos</Link>
        </Button>
        {filterTypes.map((projectType) => (
          <Button key={projectType} asChild size="sm" variant={selectedType === projectType ? 'secondary' : 'outline'}>
            <Link href={`/analytics?period=${selectedPeriod}${selectedClient ? `&client=${encodeURIComponent(selectedClient)}` : ''}&type=${encodeURIComponent(projectType)}`}>
              {projectType}
            </Link>
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title} className="bg-card border-border shadow-none">
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${card.bg}`}>
                    <Icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <p className="text-2xl font-bold">{card.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <AnalyticsCharts
        statusCounts={stats.statusCounts}
        projectsByType={stats.projectsByType}
        healthDistribution={stats.healthDistribution}
        forecastDistribution={stats.forecastDistribution}
        burndown={stats.burndown}
        velocity={stats.velocity}
      />

      <Card className="bg-card border-border shadow-none">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Custo real e lucratividade por projeto ({selectedPeriod} dias)</CardTitle>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-3">
          {!profitability.error && criticalMarginProjects.length > 0 && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
              <p className="text-sm font-semibold text-red-700">Projetos criticos de margem</p>
              <div className="mt-3 space-y-2">
                {criticalMarginProjects.map((item) => (
                  <Link
                    key={`critical-${item.projectId}`}
                    href={`/projects/${item.projectId}/finance?period=${selectedPeriod}`}
                    className="flex items-center justify-between rounded-xl border border-red-500/20 bg-background px-3 py-2 text-xs hover:border-red-500/40"
                  >
                    <span className="truncate text-foreground">{item.projectName}</span>
                    <span className="font-semibold text-red-700">
                      {item.marginGapToTarget == null ? 'Sem meta' : `${item.marginGapToTarget.toFixed(1)}pp`}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {profitability.error ? (
            <p className="text-sm text-muted-foreground">Nao foi possivel carregar lucratividade: {profitability.error}</p>
          ) : profitability.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem projetos suficientes para calcular lucratividade.</p>
          ) : (
            profitability.data.slice(0, 10).map((item) => {
              const marginTone =
                item.marginPercent == null
                  ? 'bg-slate-500/10 text-slate-600 border-slate-500/20'
                  : item.marginRisk === 'critical'
                    ? 'bg-red-500/10 text-red-600 border-red-500/20'
                    : item.marginRisk === 'warning'
                      ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'

              return (
                <Link
                  key={item.projectId}
                  href={`/projects/${item.projectId}/finance?period=${selectedPeriod}`}
                  className="flex flex-col gap-3 rounded-2xl border border-border/70 p-4 transition-colors hover:border-primary/30 hover:bg-muted/20"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{item.projectName}</p>
                      <p className="text-xs text-muted-foreground">{item.clientName ?? 'Sem cliente vinculado'}</p>
                    </div>
                    <Badge className={marginTone}>
                      {item.marginPercent == null ? 'Sem receita' : `${item.marginPercent.toFixed(1)}%`}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                    <div>
                      <p className="font-medium text-foreground">{currency.format(item.recognizedRevenue)}</p>
                      <p>Receita</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{currency.format(item.internalCost)}</p>
                      <p>Custo real</p>
                    </div>
                    <div>
                      <p className={`font-medium ${item.grossMargin < 0 ? 'text-red-600' : 'text-foreground'}`}>
                        {currency.format(item.grossMargin)}
                      </p>
                      <p>Lucro bruto</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{item.loggedHours.toFixed(1)}h</p>
                      <p>Horas</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="outline">Contrato {currency.format(item.contractValue)}</Badge>
                    {item.targetMargin != null ? (
                      <Badge variant="outline">Meta {item.targetMargin.toFixed(1)}%</Badge>
                    ) : null}
                    {item.marginGapToTarget != null ? (
                      <Badge
                        className={
                          item.marginGapToTarget < 0
                            ? 'bg-red-500/10 text-red-600 border-red-500/20'
                            : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                        }
                      >
                        Desvio {item.marginGapToTarget.toFixed(1)}pp
                      </Badge>
                    ) : null}
                  </div>
                </Link>
              )
            })
          )}
        </CardContent>
      </Card>

      <Card className="bg-card border-border shadow-none">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Performance individual ({selectedPeriod} dias)</CardTitle>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-3">
          {individualPerformance.error ? (
            <p className="text-sm text-muted-foreground">
              Nao foi possivel carregar performance individual: {individualPerformance.error}
            </p>
          ) : individualPerformance.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados suficientes para calcular performance individual.</p>
          ) : (
            individualPerformance.data.slice(0, 12).map((person, index) => {
              const scoreTone =
                person.efficiencyScore >= 75
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                  : person.efficiencyScore >= 55
                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                    : 'bg-red-500/10 text-red-600 border-red-500/20'

              return (
                <Link
                  key={person.userId}
                  href={`/team?member=${person.userId}&period=${selectedPeriod}`}
                  className="block rounded-2xl border border-border/70 p-4 transition-colors hover:border-primary/30 hover:bg-muted/20"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        #{index + 1} {person.fullName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {person.loggedHours.toFixed(1)}h logadas · {person.completedTasks} tarefas concluidas
                      </p>
                    </div>
                    <Badge className={scoreTone}>{person.efficiencyScore.toFixed(0)}/100</Badge>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-5">
                    <div>
                      <p className="font-medium text-foreground">{person.completionRate.toFixed(1)}%</p>
                      <p>Horas aprovadas</p>
                    </div>
                    <div>
                      <p className={`font-medium ${person.overdueOpenTasks > 0 ? 'text-red-600' : 'text-foreground'}`}>
                        {person.overdueOpenTasks}
                      </p>
                      <p>Atrasadas</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{currency.format(person.internalCost)}</p>
                      <p>Custo</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{currency.format(person.billableEstimate)}</p>
                      <p>Receita est.</p>
                    </div>
                    <div>
                      <p className={`font-medium ${person.grossContribution < 0 ? 'text-red-600' : 'text-foreground'}`}>
                        {currency.format(person.grossContribution)}
                      </p>
                      <p>Contribuicao</p>
                    </div>
                  </div>
                </Link>
              )
            })
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 bg-card border-border shadow-none">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Projetos em atencao</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.projectHealthSummaries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum projeto ativo para analisar.</p>
            ) : (
              stats.projectHealthSummaries.slice(0, 6).map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="flex flex-col gap-3 rounded-2xl border border-border/70 p-4 transition-colors hover:border-primary/30 hover:bg-muted/20"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{project.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {project.clientName ?? 'Sem cliente vinculado'}
                      </p>
                    </div>
                    <Badge className={scoreStyles(project.score)}>{project.score}/100</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                    <div>
                      <p className="font-medium text-foreground">{project.openRisksCount}</p>
                      <p>Riscos</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{project.pendingApprovalsCount}</p>
                      <p>Aprovacoes</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{project.overdueTasksCount}</p>
                      <p>Atrasos</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {project.projectedDelayDays > 0 ? `${project.projectedDelayDays}d` : '0d'}
                      </p>
                      <p>Delay previsto</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="outline">Confianca {project.confidenceScore}%</Badge>
                    {project.workloadAlert ? <Badge variant="outline">Sobrecarga</Badge> : null}
                    {project.blockedTasksCount > 0 ? (
                      <Badge variant="outline">{project.blockedTasksCount} bloqueio(s)</Badge>
                    ) : null}
                    {project.projectedCompletionDate ? (
                      <Badge variant="outline">Entrega {project.projectedCompletionDate}</Badge>
                    ) : null}
                  </div>

                  <p className="text-xs text-muted-foreground">{project.rationale}</p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-none">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Indicadores preditivos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-sm">Delay medio previsto</span>
              </div>
              <span className="font-bold">{stats.predictiveSummary.avgProjectedDelay}d</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-primary" />
                <span className="text-sm">Sobrecargas ativas</span>
              </div>
              <span className="font-bold">{stats.predictiveSummary.workloadAlerts}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-primary" />
                <span className="text-sm">Margem sob pressao</span>
              </div>
              <span className="font-bold">{stats.predictiveSummary.marginPressureCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-sm">Aprovacoes pendentes</span>
              </div>
              <span className="font-bold">{stats.predictiveSummary.pendingApprovalsTotal}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border shadow-none">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Atividade recente</CardTitle>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <ActivityTimeline activities={stats.recentActivities as ActivityWithUser[]} />
        </CardContent>
      </Card>
    </div>
  )
}
