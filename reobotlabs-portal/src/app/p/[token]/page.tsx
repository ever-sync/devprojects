import { notFound } from 'next/navigation'
import {
  getProjectByPublicToken,
  getPublicProjectDocuments,
  getPublicProjectTasks,
} from '@/actions/public-portal'
import { getPublicProjectActivities } from '@/actions/activities'
import { getPublicApprovalsByToken } from '@/actions/approvals'
import { ActivityTimeline } from '@/components/activity/ActivityTimeline'
import { PublicApprovalPanel } from '@/components/public/PublicApprovalPanel'
import { PublicDocumentList } from '@/components/public/PublicDocumentList'
import { PublicProjectOverview } from '@/components/public/PublicProjectOverview'
import { PublicTaskPanel } from '@/components/public/PublicTaskPanel'
import { GanttView } from '@/components/timeline/GanttView'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createAdminClient } from '@/lib/supabase/server'
import { differenceInDays, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Calendar,
  CheckSquare,
  ClipboardCheck,
  FolderOpen,
  History,
  LayoutGrid,
  Sparkles,
  Timer,
} from 'lucide-react'

interface Props {
  params: Promise<{ token: string }>
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  paused: 'Pausado',
  completed: 'Concluido',
  cancelled: 'Cancelado',
}

export default async function PublicProjectPage({ params }: Props) {
  const { token } = await params
  const { data: project, error } = await getProjectByPublicToken(token)

  if (error || !project) notFound()

  const supabase = createAdminClient()

  const [activitiesRes, tasksRes, documentsRes, approvalsRes, { data: phases }] = await Promise.all([
    getPublicProjectActivities(token),
    getPublicProjectTasks(token),
    getPublicProjectDocuments(token),
    getPublicApprovalsByToken(token),
    supabase
      .from('project_phases')
      .select('*')
      .eq('project_id', project.id)
      .order('order_index', { ascending: true }),
  ])

  const pendingClientTasks = tasksRes.data.filter(
    (task) => task.owner_type === 'client' && task.status !== 'done'
  ).length
  const pendingApprovals = approvalsRes.data.filter((approval) => approval.status === 'pending').length
  const documentsCount = documentsRes.data.length
  const phaseCount = phases?.length ?? 0
  const activitiesCount = activitiesRes.data.length
  const clientName = project.clients ? (project.clients as { name: string }).name : 'Projeto em acompanhamento'
  const daysLeft = project.target_end_date
    ? differenceInDays(new Date(project.target_end_date), new Date())
    : null
  const statusLabel = STATUS_LABELS[project.status] ?? project.status
  const defaultTab = pendingApprovals > 0 ? 'approvals' : pendingClientTasks > 0 ? 'tasks' : 'overview'
  const totalPendingActions = pendingClientTasks + pendingApprovals
  const tabTriggerClassName =
    'min-w-fit shrink-0 rounded-2xl border border-transparent bg-transparent px-4 py-3 text-sm font-medium text-slate-500 transition-all duration-200 hover:border-white/70 hover:bg-white/80 hover:text-slate-900 data-[state=active]:border-slate-950/10 data-[state=active]:bg-[linear-gradient(135deg,#0f172a,#1e293b)] data-[state=active]:text-white data-[state=active]:shadow-[0_12px_24px_rgba(15,23,42,0.18)] [&_svg]:transition-colors data-[state=active]:[&_svg]:text-sky-200'

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="relative overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(247,250,252,0.94))] p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:rounded-[32px] sm:p-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_42%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.14),transparent_32%)]" />

        <div className="relative space-y-6 sm:space-y-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                  Portal do cliente
                </span>
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-medium text-slate-600">
                  {statusLabel}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">{clientName}</p>
                  <h1 className="max-w-2xl text-2xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
                    {project.name}
                  </h1>
                </div>
                <p className="max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                  {project.description || 'Acompanhe entregas, aprovacoes, documentos e o andamento do projeto em um ambiente organizado e direto.'}
                </p>
              </div>
            </div>

            <div className="grid min-w-full gap-3 sm:grid-cols-2 lg:min-w-[340px] lg:max-w-[360px]">
              <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <Sparkles className="h-4 w-4 text-sky-500" />
                  <span className="text-xs font-medium uppercase tracking-[0.16em]">Progresso</span>
                </div>
                <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-3xl">
                  {project.progress_percent}%
                </p>
                <p className="mt-1 text-sm text-slate-500">Execucao consolidada do projeto</p>
              </div>

              <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <Timer className="h-4 w-4 text-slate-700" />
                  <span className="text-xs font-medium uppercase tracking-[0.16em]">Prazo</span>
                </div>
                <p className="mt-3 text-xl font-semibold tracking-[-0.03em] text-slate-950">
                  {project.target_end_date
                    ? format(new Date(project.target_end_date), "d 'de' MMM", { locale: ptBR })
                    : 'Sem data'}
                </p>
                <p className={`mt-1 text-sm ${daysLeft != null && daysLeft < 0 ? 'text-rose-500' : daysLeft != null && daysLeft <= 7 ? 'text-amber-500' : 'text-slate-500'}`}>
                  {daysLeft == null
                    ? 'Planejamento em definicao'
                    : daysLeft < 0
                      ? `${Math.abs(daysLeft)} dias de atraso`
                      : daysLeft === 0
                        ? 'Entrega prevista para hoje'
                        : `${daysLeft} dias restantes`}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200/70 bg-white/75 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Tarefas aguardando voce</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{pendingClientTasks}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-white/75 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Aprovacoes pendentes</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{pendingApprovals}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-white/75 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Fases mapeadas</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{phaseCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-white/75 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Documentos disponiveis</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{documentsCount}</p>
            </div>
          </div>
        </div>
      </section>

      <section className={`rounded-[24px] border p-4 shadow-[0_18px_45px_rgba(15,23,42,0.05)] sm:rounded-[28px] sm:p-6 ${
        totalPendingActions > 0
          ? 'border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.96),rgba(255,255,255,0.94))]'
          : 'border-emerald-200/80 bg-[linear-gradient(180deg,rgba(236,253,245,0.96),rgba(255,255,255,0.94))]'
      }`}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Foco da semana</p>
            <h2 className="text-xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-2xl">
              {totalPendingActions > 0
                ? 'Existem decisoes aguardando retorno do cliente'
                : 'Nenhuma acao critica pendente neste momento'}
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              {totalPendingActions > 0
                ? `Ha ${pendingApprovals} aprovacao(oes) e ${pendingClientTasks} tarefa(s) aguardando validacao ou resposta. O portal ja abre na area mais importante para acelerar esse fluxo.`
                : 'Use as abas abaixo para acompanhar entregas, cronograma, documentos e o historico recente do projeto.'}
            </p>
          </div>

          <div className="grid min-w-full gap-3 sm:grid-cols-2 lg:min-w-[320px]">
            <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Aprovacoes</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{pendingApprovals}</p>
            </div>
            <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Tarefas para revisar</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{pendingClientTasks}</p>
            </div>
          </div>
        </div>
      </section>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="mb-2 flex h-auto w-full flex-nowrap gap-2 overflow-x-auto rounded-[24px] border border-white/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,0.82))] p-2 shadow-[0_18px_45px_rgba(15,23,42,0.05)] sm:flex-wrap sm:overflow-visible sm:rounded-[28px]">
          <TabsTrigger value="overview" className={tabTriggerClassName}>
            <LayoutGrid className="h-4 w-4" />
            Visao geral
          </TabsTrigger>

          <TabsTrigger value="tasks" className={tabTriggerClassName}>
            <CheckSquare className="h-4 w-4" />
            Tarefas
            {pendingClientTasks > 0 && (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 ring-1 ring-amber-500/10">
                {pendingClientTasks}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger value="approvals" className={tabTriggerClassName}>
            <ClipboardCheck className="h-4 w-4" />
            Aprovacoes
            {pendingApprovals > 0 && (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-bold text-sky-600 ring-1 ring-sky-500/10">
                {pendingApprovals}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger value="timeline" className={tabTriggerClassName}>
            <Calendar className="h-4 w-4" />
            Cronograma
          </TabsTrigger>

          <TabsTrigger value="documents" className={tabTriggerClassName}>
            <FolderOpen className="h-4 w-4" />
            Documentos
            {documentsCount > 0 && (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 ring-1 ring-slate-200">
                {documentsCount}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger value="activity" className={tabTriggerClassName}>
            <History className="h-4 w-4" />
            Atividade
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-4">
          <PublicProjectOverview
            project={project}
            pendingClientTasks={pendingClientTasks}
            pendingApprovals={pendingApprovals}
            documentsCount={documentsCount}
            phaseCount={phaseCount}
            activitiesCount={activitiesCount}
          />
        </TabsContent>

        <TabsContent value="tasks" className="pt-4">
          <PublicTaskPanel tasks={tasksRes.data} token={token} />
        </TabsContent>

        <TabsContent value="approvals" className="pt-4">
          <PublicApprovalPanel approvals={approvalsRes.data} token={token} />
        </TabsContent>

        <TabsContent value="timeline" className="pt-4">
          <div className="overflow-x-auto rounded-[24px] border border-white/70 bg-white/85 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.05)] sm:rounded-[28px] sm:p-6">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Planejamento</p>
                <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">Cronograma de fases</h3>
              </div>
              <p className="text-sm text-slate-500">{phaseCount} fase(s) cadastrada(s)</p>
            </div>
            <GanttView phases={phases ?? []} />
          </div>
        </TabsContent>

        <TabsContent value="documents" className="pt-4">
          <PublicDocumentList documents={documentsRes.data} token={token} />
        </TabsContent>

        <TabsContent value="activity" className="pt-4">
          <div className="rounded-[24px] border border-white/70 bg-white/85 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.05)] sm:rounded-[28px] sm:p-6">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Historico</p>
              <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">Linha do tempo do projeto</h3>
            </div>
            <div className="mx-auto max-w-3xl">
              <ActivityTimeline activities={activitiesRes.data} />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
