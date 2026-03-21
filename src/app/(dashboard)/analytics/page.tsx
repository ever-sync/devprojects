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

export default async function AnalyticsPage() {
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

  const stats = await getAdminAnalytics()

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
      />

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
