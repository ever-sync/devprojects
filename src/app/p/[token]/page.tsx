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
import { PublicScopePanel } from '@/components/public/PublicScopePanel'
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
  FileText,
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

  const [
    activitiesRes,
    tasksRes,
    documentsRes,
    approvalsRes,
    { data: phases },
    { data: scopeVersions },
    { data: changeRequests },
  ] = await Promise.all([
    getPublicProjectActivities(token),
    getPublicProjectTasks(token),
    getPublicProjectDocuments(token),
    getPublicApprovalsByToken(token),
    supabase
      .from('project_phases')
      .select('*')
      .eq('project_id', project.id)
      .order('order_index', { ascending: true }),
    supabase
      .from('project_scope_versions')
      .select('id,version_number,title,summary,scope_body,created_at')
      .eq('project_id', project.id)
      .order('version_number', { ascending: false }),
    supabase
      .from('change_requests')
      .select('id,title,impact_summary,status,requested_deadline,created_at')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false }),
  ])

  const pendingClientTasks = tasksRes.data.filter(
    (task) => task.owner_type === 'client' && task.status !== 'done'
  ).length
  const pendingApprovals = approvalsRes.data.filter((approval) => approval.status === 'pending').length
  const documentsCount = documentsRes.data.length
  const phaseCount = phases?.length ?? 0
  const scopeVersionCount = scopeVersions?.length ?? 0
  const changeRequestCount = changeRequests?.length ?? 0
  const activitiesCount = activitiesRes.data.length
  const clientName = project.clients ? (project.clients as { name: string }).name : 'Projeto em acompanhamento'
  const daysLeft = project.target_end_date
    ? differenceInDays(new Date(project.target_end_date), new Date())
    : null
  const statusLabel = STATUS_LABELS[project.status] ?? project.status
  const defaultTab = pendingApprovals > 0 ? 'approvals' : pendingClientTasks > 0 ? 'tasks' : 'overview'
  const totalPendingActions = pendingClientTasks + pendingApprovals
  const tabTriggerClassName =
    'min-w-fit shrink-0 rounded-2xl border border-transparent bg-transparent px-4 py-3 text-sm font-medium text-slate-600 transition-all duration-200 hover:border-white/80 hover:bg-white hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 data-[state=active]:border-slate-950/10 data-[state=active]:bg-[linear-gradient(135deg,#0f172a,#1e293b)] data-[state=active]:text-white data-[state=active]:shadow-[0_12px_24px_rgba(15,23,42,0.18)] [&_svg]:transition-colors data-[state=active]:[&_svg]:text-sky-200'

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef4fb_35%,#f8fafc_100%)]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-[10%] -top-[10%] h-[40%] w-[40%] rounded-full bg-sky-200/25 blur-[120px]" />
        <div className="absolute -right-[5%] top-[10%] h-[35%] w-[35%] rounded-full bg-indigo-200/18 blur-[100px]" />
        <div className="absolute bottom-[20%] left-[15%] h-[30%] w-[30%] rounded-full bg-emerald-200/12 blur-[110px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl space-y-5 px-4 py-6 sm:space-y-6 sm:px-6 sm:py-10 lg:px-8">
        <section className="relative overflow-hidden rounded-[28px] border border-white/80 bg-white/65 p-5 shadow-[0_32px_80px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:rounded-[36px] sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-full bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_60%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.08),transparent_50%)]" />

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

              <div className="grid min-w-full gap-3 sm:grid-cols-2 lg:min-w-[380px] lg:max-w-[400px]">
                <div className="group rounded-[28px] border border-white/80 bg-white/55 p-5 backdrop-blur-sm transition-all duration-300 hover:bg-white/85 hover:shadow-lg">
                  <div className="flex items-center gap-2 text-slate-500">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-sky-600 transition-transform group-hover:scale-110">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Progresso</span>
                  </div>
                  <div className="mt-4 flex items-center gap-4">
                    <div className="relative h-14 w-14 shrink-0">
                      <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
                        <circle cx="18" cy="18" r="15" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                        <circle
                          cx="18"
                          cy="18"
                          r="15"
                          fill="none"
                          stroke="url(#progressGradient)"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray={`${(project.progress_percent / 100) * 94.25} 94.25`}
                          className="transition-all duration-1000 ease-out"
                        />
                        <defs>
                          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#0ea5e9" />
                            <stop offset="100%" stopColor="#6366f1" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-slate-800">
                        {project.progress_percent}%
                      </span>
                    </div>
                    <div>
                      <p className="text-3xl font-bold tracking-[-0.05em] text-slate-950">
                        {project.progress_percent}%
                      </p>
                      <p className="text-xs font-medium text-slate-500">Conclusao geral</p>
                    </div>
                  </div>
                </div>

                <div className="group rounded-[28px] border border-white/80 bg-white/55 p-5 backdrop-blur-sm transition-all duration-300 hover:bg-white/85 hover:shadow-lg">
                  <div className="flex items-center gap-2 text-slate-500">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 transition-transform group-hover:scale-110">
                      <Timer className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Prazo</span>
                  </div>
                  <div className="mt-4">
                    <p className="text-2xl font-bold tracking-[-0.04em] text-slate-950">
                      {project.target_end_date
                        ? format(new Date(project.target_end_date), "d 'de' MMMM", { locale: ptBR })
                        : 'Em pauta'}
                    </p>
                    <p className={`mt-1 text-xs font-semibold ${daysLeft != null && daysLeft < 0 ? 'text-rose-600' : daysLeft != null && daysLeft <= 7 ? 'text-amber-600' : 'text-slate-500'}`}>
                      {daysLeft == null
                        ? 'Planejamento ativo'
                        : daysLeft < 0
                          ? `${Math.abs(daysLeft)} dias de atraso`
                          : daysLeft === 0
                            ? 'Finaliza hoje'
                            : `${daysLeft} dias restantes`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
              <div className="rounded-[24px] border border-amber-200/60 bg-amber-50/70 px-4 py-3">
                <div className="flex items-center gap-1.5 text-amber-600">
                  <CheckSquare className="h-3.5 w-3.5" />
                  <p className="text-xs font-medium uppercase tracking-[0.14em]">Tarefas</p>
                </div>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{pendingClientTasks}</p>
                <p className="text-xs text-slate-500">Aguardando voce</p>
              </div>
              <div className="rounded-[24px] border border-sky-200/60 bg-sky-50/70 px-4 py-3">
                <div className="flex items-center gap-1.5 text-sky-600">
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  <p className="text-xs font-medium uppercase tracking-[0.14em]">Aprovacoes</p>
                </div>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{pendingApprovals}</p>
                <p className="text-xs text-slate-500">Pendentes</p>
              </div>
              <div className="rounded-[24px] border border-violet-200/60 bg-violet-50/70 px-4 py-3">
                <div className="flex items-center gap-1.5 text-violet-600">
                  <Calendar className="h-3.5 w-3.5" />
                  <p className="text-xs font-medium uppercase tracking-[0.14em]">Fases</p>
                </div>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{phaseCount}</p>
                <p className="text-xs text-slate-500">Mapeadas</p>
              </div>
              <div className="rounded-[24px] border border-slate-200/70 bg-white/80 px-4 py-3">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <FolderOpen className="h-3.5 w-3.5" />
                  <p className="text-xs font-medium uppercase tracking-[0.14em]">Docs</p>
                </div>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{documentsCount}</p>
                <p className="text-xs text-slate-500">Disponiveis</p>
              </div>
              <div className="rounded-[24px] border border-emerald-200/70 bg-emerald-50/80 px-4 py-3">
                <div className="flex items-center gap-1.5 text-emerald-600">
                  <FileText className="h-3.5 w-3.5" />
                  <p className="text-xs font-medium uppercase tracking-[0.14em]">Versoes</p>
                </div>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{scopeVersionCount}</p>
                <p className="text-xs text-slate-500">Escopo publicado</p>
              </div>
              <div className="rounded-[24px] border border-rose-200/70 bg-rose-50/80 px-4 py-3">
                <div className="flex items-center gap-1.5 text-rose-600">
                  <History className="h-3.5 w-3.5" />
                  <p className="text-xs font-medium uppercase tracking-[0.14em]">Mudancas</p>
                </div>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{changeRequestCount}</p>
                <p className="text-xs text-slate-500">Solicitacoes</p>
              </div>
            </div>
          </div>
        </section>

        <section className={`rounded-[28px] border p-5 transition-all duration-500 sm:rounded-[34px] sm:p-7 ${
          totalPendingActions > 0
            ? 'border-amber-200/60 bg-[linear-gradient(135deg,rgba(255,251,235,0.9),rgba(255,255,255,0.72))] backdrop-blur-md'
            : 'border-emerald-200/60 bg-[linear-gradient(135deg,rgba(236,253,245,0.85),rgba(255,255,255,0.72))] backdrop-blur-md'
        }`}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${totalPendingActions > 0 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Foco da semana</p>
              </div>
              <h2 className="text-2xl font-bold tracking-[-0.04em] text-slate-950 sm:text-3xl">
                {totalPendingActions > 0
                  ? 'Existem decisoes aguardando retorno do cliente'
                  : 'Seu projeto esta fluindo com previsibilidade'}
              </h2>
              <p className="max-w-3xl text-sm font-medium leading-7 text-slate-600">
                {totalPendingActions > 0
                  ? `Ha ${pendingApprovals} aprovacao(oes) e ${pendingClientTasks} tarefa(s) aguardando validacao ou resposta. O portal ja abre na area mais importante para acelerar esse fluxo.`
                  : 'Nenhuma acao critica pendente agora. Use as abas abaixo para acompanhar cronograma, documentos e historico recente.'}
              </p>
            </div>

            <div className="grid min-w-full gap-3 sm:grid-cols-2 lg:min-w-[340px]">
              <div className="group rounded-[24px] border border-white/80 bg-white/75 p-5 shadow-sm transition-all hover:bg-white hover:shadow-md">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Aprovacoes</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950 transition-colors group-hover:text-sky-600">{pendingApprovals}</p>
              </div>
              <div className="group rounded-[24px] border border-white/80 bg-white/75 p-5 shadow-sm transition-all hover:bg-white hover:shadow-md">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Tarefas para revisar</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950 transition-colors group-hover:text-amber-600">{pendingClientTasks}</p>
              </div>
            </div>
          </div>
        </section>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="sticky top-3 z-20 mb-6 flex h-auto w-full flex-nowrap gap-2 overflow-x-auto rounded-[28px] border border-white/80 bg-white/70 p-2 shadow-[0_20px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:flex-wrap sm:overflow-visible">
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

            <TabsTrigger value="scope" className={tabTriggerClassName}>
              <FileText className="h-4 w-4" />
              Escopo
              {changeRequestCount > 0 && (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 ring-1 ring-rose-500/10">
                  {changeRequestCount}
                </span>
              )}
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
            <div className="rounded-[24px] border border-white/70 bg-white/88 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.05)] sm:rounded-[28px] sm:p-6">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Planejamento</p>
                  <h3 className="mt-1.5 text-xl font-semibold tracking-[-0.03em] text-slate-950">Cronograma de fases</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                    No celular, acompanhe as fases em sequencia. Em telas maiores, visualize a linha do tempo completa.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200/70 bg-violet-50/80 px-3 py-1.5 text-xs font-semibold text-violet-700">
                  <Calendar className="h-3.5 w-3.5" />
                  {phaseCount} fase{phaseCount !== 1 ? 's' : ''} cadastrada{phaseCount !== 1 ? 's' : ''}
                </span>
              </div>
              <GanttView phases={phases ?? []} />
            </div>
          </TabsContent>

          <TabsContent value="documents" className="pt-4">
            <PublicDocumentList documents={documentsRes.data} token={token} />
          </TabsContent>

          <TabsContent value="activity" className="pt-4">
            <div className="rounded-[24px] border border-white/70 bg-white/88 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.05)] sm:rounded-[28px] sm:p-6">
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Historico</p>
                <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">Linha do tempo do projeto</h3>
              </div>
              <div className="mx-auto max-w-3xl">
                <ActivityTimeline activities={activitiesRes.data} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="scope" className="pt-4">
            <PublicScopePanel
              scopeVersions={scopeVersions ?? []}
              changeRequests={changeRequests ?? []}
            />
          </TabsContent>
        </Tabs>

        <footer className="mt-12 border-t border-slate-200/70 bg-white/45 px-6 pb-8 pt-10 text-center backdrop-blur-sm sm:-mx-8 lg:-mx-12 lg:px-10">
          <div className="mx-auto flex max-w-4xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="space-y-1 text-left">
              <p className="text-sm font-semibold text-slate-950">Ambiente mantido por ReobotLabs</p>
              <p className="text-xs text-slate-500">Desenvolvido para oferecer transparencia, contexto e rapidez em cada entrega.</p>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Portal do Cliente v2.0</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
