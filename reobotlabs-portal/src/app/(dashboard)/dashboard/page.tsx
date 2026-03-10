import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProjectCard } from '@/components/dashboard/ProjectCard'
import { ProjectFolderCard } from '@/components/dashboard/ProjectFolderCard'
import { MiniCalendar } from '@/components/dashboard/MiniCalendar'
import { NoticeBoard } from '@/components/dashboard/NoticeBoard'
import { getAdminAnalytics } from '@/actions/analytics'
import { EmptyState } from '@/components/shared/EmptyState'
import { DashboardActions } from '@/components/dashboard/DashboardActions'
import { Button } from '@/components/ui/button'
import {
  FolderKanban,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Users,
  Activity,
  ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import type { CommentWithAuthor, Project, Client } from '@/types'

type ProjectWithClient = Project & { clients?: Pick<Client, 'name'> | null }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const isAdmin = profile.role === 'admin'

  // --- Fetch projects ---
  let projects: ProjectWithClient[] = []
  if (isAdmin) {
    const { data } = await supabase
      .from('projects')
      .select('*, clients(name)')
      .order('updated_at', { ascending: false })
    projects = (data ?? []) as ProjectWithClient[]
  } else {
    const { data } = await supabase
      .from('projects')
      .select('*, clients(name)')
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
    projects = (data ?? []) as ProjectWithClient[]
    if (projects.length === 1) redirect(`/projects/${projects[0].id}`)
  }

  // --- Admin stats & extras ---
  let adminStats = {
    activeCount: 0,
    clientsCount: 0,
    inProgressCount: 0,
    tasksDone: 0,
    tasksTotal: 0,
    healthGreen: 0,
    healthYellow: 0,
    healthRed: 0,
    overdueCount: 0,
  }
  let teamMembers: { id: string; full_name: string; email: string; avatar_url: string | null; role: string; company: string | null }[] = []
  let notices: CommentWithAuthor[] = []
  let taskDueDates: string[] = []
  let overdueProjects: ProjectWithClient[] = []
  const pendingByProject: Record<string, number> = {}
  let predictiveOverview = {
    avgHealthScore: 0,
    atRiskProjects: 0,
    workloadAlerts: 0,
  }

  // Data for quick-create dialogs (admin only)
  let allClients: { id: string; name: string }[] = []
  let allProjects: { id: string; name: string; client_id: string }[] = []
  let clientUsers: { id: string; full_name: string; email: string; avatar_url: string | null; client_id: string }[] = []

  if (isAdmin) {
    const today = new Date().toISOString().split('T')[0]
    const analytics = await getAdminAnalytics()
    predictiveOverview = {
      avgHealthScore: analytics.kpis.avgHealthScore,
      atRiskProjects: analytics.kpis.atRiskProjects,
      workloadAlerts: analytics.predictiveSummary.workloadAlerts,
    }

    const [
      activeResult,
      clientsResult,
      tasksResult,
      tasksDoneResult,
      tasksTotalResult,
      teamResult,
      noticesResult,
      dueDatesResult,
    ] = await Promise.all([
      supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('clients').select('*', { count: 'exact', head: true }),
      supabase.from('tasks').select('*', { count: 'exact', head: true }).in('status', ['in_progress', 'review']),
      supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'done'),
      supabase.from('tasks').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('id, full_name, email, avatar_url, role, company').eq('role', 'admin').order('full_name'),
      supabase
        .from('comments')
        .select('*, author:profiles!author_id(id, full_name, avatar_url, role)')
        .eq('is_internal', true)
        .is('task_id', null)
        .not('content', 'like', '[[system:%')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('tasks')
        .select('due_date')
        .not('due_date', 'is', null)
        .neq('status', 'done')
        .gte('due_date', today),
    ])

    const healthGreen = projects.filter((p) => p.health === 'green').length
    const healthYellow = projects.filter((p) => p.health === 'yellow').length
    const healthRed = projects.filter((p) => p.health === 'red').length
    overdueProjects = projects.filter(
      (p) => p.status === 'active' && p.target_end_date && p.target_end_date < today,
    )

    adminStats = {
      activeCount: activeResult.count ?? 0,
      clientsCount: clientsResult.count ?? 0,
      inProgressCount: tasksResult.count ?? 0,
      tasksDone: tasksDoneResult.count ?? 0,
      tasksTotal: tasksTotalResult.count ?? 0,
      healthGreen,
      healthYellow,
      healthRed,
      overdueCount: overdueProjects.length,
    }
    teamMembers = teamResult.data ?? []
    notices = (noticesResult.data ?? []) as unknown as CommentWithAuthor[]
    taskDueDates = (dueDatesResult.data ?? []).map((t) => t.due_date as string)

    // Fetch data for quick-create dialogs
    const [dialogClientsResult, allProjectsResult, workspaceMembersResult] = await Promise.all([
      supabase.from('clients').select('id, name, workspace_id').order('name'),
      supabase.from('projects').select('id, name, client_id').eq('status', 'active').order('name'),
      supabase
        .from('workspace_members')
        .select('user_id, workspace_id, profiles!workspace_members_user_id_fkey(full_name, email, avatar_url, role)')
        .returns<{ user_id: string; workspace_id: string; profiles: { full_name: string; email: string; avatar_url: string | null; role: string } | null }[]>(),
    ])
    const clientRows = dialogClientsResult.data ?? []
    const workspaceToClientId = new Map(clientRows.map((client) => [client.workspace_id, client.id]))
    allClients = clientRows.map(({ id, name }) => ({ id, name }))
    allProjects = allProjectsResult.data ?? []
    clientUsers = (workspaceMembersResult.data ?? [])
      .filter((member) => member.profiles?.role === 'client' && workspaceToClientId.has(member.workspace_id))
      .filter((member) => member.profiles)
      .map((cu) => ({
        id: cu.user_id,
        full_name: cu.profiles!.full_name,
        email: cu.profiles!.email,
        avatar_url: cu.profiles!.avatar_url,
        client_id: workspaceToClientId.get(cu.workspace_id)!,
      }))
  } else {
    const { data: pendingData } = await supabase
      .from('tasks')
      .select('project_id')
      .eq('owner_type', 'client')
      .neq('status', 'done')
    for (const t of pendingData ?? []) {
      if (t.project_id) {
        pendingByProject[t.project_id] = (pendingByProject[t.project_id] ?? 0) + 1
      }
    }
  }

  const activeProjects = projects.filter((p) => p.status === 'active')
  const completionRate =
    adminStats.tasksTotal > 0
      ? Math.round((adminStats.tasksDone / adminStats.tasksTotal) * 100)
      : null
  const clientPendingTotal = Object.values(pendingByProject).reduce((acc, value) => acc + value, 0)
  const nextClientDeadline = !isAdmin
    ? activeProjects
      .filter((p) => Boolean(p.target_end_date))
      .sort((a, b) => (a.target_end_date ?? '').localeCompare(b.target_end_date ?? ''))[0] ?? null
    : null

  return (
    <div className="dashboard-fade-in relative space-y-8">
      {/* Background atmosphere */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="dashboard-orb-a absolute -top-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-3xl" />
        <div className="dashboard-orb-b absolute -bottom-48 -right-40 h-96 w-96 rounded-full bg-gradient-to-tr from-primary/12 to-transparent blur-3xl" />
        <div className="absolute inset-x-0 top-24 h-px bg-gradient-to-r from-transparent via-border/70 to-transparent" />
      </div>

      <div className="rounded-3xl border border-primary/20 bg-white p-6 md:p-8 backdrop-blur-xl shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
            <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_16px_rgba(37,235,205,0.5)]" />
            ReobotLabs Command Center
          </span>
          <span className="rounded-full border border-border/70 bg-background/60 px-3 py-1 text-[11px] text-muted-foreground">
            {isAdmin ? 'Modo Admin' : 'Modo Cliente'}
          </span>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              {isAdmin ? 'Visao Geral Operacional' : 'Painel de Acompanhamento'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isAdmin
                ? `${projects.length} projeto(s) monitorados com indicadores em tempo real`
                : 'Cronograma, aprovacoes e entregas em uma visao unificada'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && (
              <Button asChild size="sm" className="rounded-full">
                <Link href="/projects/new">
                  <Plus className="w-4 h-4 mr-1" />
                  Novo Projeto
                </Link>
              </Button>
            )}
            {isAdmin && (
              <DashboardActions
                clients={allClients}
                projects={allProjects}
                teamMembers={teamMembers.map(({ id, full_name, email, avatar_url }) => ({ id, full_name, email, avatar_url }))}
                clientUsers={clientUsers}
              />
            )}
            <Button asChild size="sm" variant="outline" className="rounded-full border-border bg-background/40">
              <Link href={isAdmin ? '/clients' : '/projects'}>
                <FolderKanban className="w-4 h-4 mr-1" />
                {isAdmin ? 'Clientes' : 'Projetos'}
              </Link>
            </Button>
            {isAdmin && (
              <Button asChild size="sm" variant="secondary" className="rounded-full">
                <Link href="/team">
                  <Activity className="w-4 h-4 mr-1" />
                  Equipe
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats row (admin only) ── */}
      {isAdmin && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-8 gap-4">

          {/* Projetos Ativos */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-white p-5 flex flex-col gap-3 shadow-[0_4px_12px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Projetos Ativos</p>
              <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
                <FolderKanban className="w-4 h-4 text-primary" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground leading-none">{adminStats.activeCount}</p>
          </div>

          {/* Clientes */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-white p-5 flex flex-col gap-3 shadow-[0_4px_12px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Clientes</p>
              <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
                <Users className="w-4 h-4 text-primary" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground leading-none">{adminStats.clientsCount}</p>
          </div>

          {/* Em Andamento */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-white p-5 flex flex-col gap-3 shadow-[0_4px_12px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Em Andamento</p>
              <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
                <Activity className="w-4 h-4 text-primary" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground leading-none">{adminStats.inProgressCount}</p>
          </div>

          {/* Taxa de Conclusão */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-white p-5 flex flex-col gap-3 shadow-[0_4px_12px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Conclusão</p>
              <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-primary" />
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground leading-none">
                {completionRate !== null ? `${completionRate}%` : '—'}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                {adminStats.tasksDone}/{adminStats.tasksTotal} tarefas
              </p>
            </div>
          </div>

          {/* Saúde */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-white p-5 flex flex-col gap-3 shadow-[0_4px_12px_rgba(15,23,42,0.06)]">
            <p className="text-xs font-medium text-muted-foreground">Saúde dos Projetos</p>
            <div className="flex items-end gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary leading-none">{adminStats.healthGreen}</p>
                <p className="text-[10px] text-muted-foreground mt-1">No prazo</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-400 leading-none">{adminStats.healthYellow}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Atenção</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-400 leading-none">{adminStats.healthRed}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Crítico</p>
              </div>
            </div>
          </div>

          {/* Atrasados */}
          <div className={`relative overflow-hidden rounded-2xl border p-5 flex flex-col gap-3 shadow-[0_4px_12px_rgba(15,23,42,0.06)] ${
            adminStats.overdueCount > 0
              ? 'border-red-500/30 bg-red-500/10'
              : 'border-border bg-white'
          }`}>
            <div className={`absolute inset-0 pointer-events-none bg-gradient-to-br ${
              adminStats.overdueCount > 0 ? 'from-red-500/15 to-transparent' : 'from-slate-500/10 to-transparent'
            }`} />
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Atrasados</p>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                adminStats.overdueCount > 0 ? 'bg-red-500/20' : 'bg-muted/30'
              }`}>
                <AlertTriangle className={`w-4 h-4 ${adminStats.overdueCount > 0 ? 'text-red-400' : 'text-muted-foreground'}`} />
              </div>
            </div>
            <p className={`text-3xl font-bold leading-none ${
              adminStats.overdueCount > 0 ? 'text-red-400' : 'text-foreground'
            }`}>
              {adminStats.overdueCount}
            </p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-border bg-white p-5 flex flex-col gap-3 shadow-[0_4px_12px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Health Score</p>
              <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
                <Activity className="w-4 h-4 text-primary" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground leading-none">{predictiveOverview.avgHealthScore}</p>
            <p className="text-[11px] text-muted-foreground mt-1.5">media da carteira ativa</p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-border bg-white p-5 flex flex-col gap-3 shadow-[0_4px_12px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Forecast de Risco</p>
              <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-primary" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground leading-none">{predictiveOverview.atRiskProjects}</p>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              {predictiveOverview.workloadAlerts} com sobrecarga ativa
            </p>
          </div>

        </div>
      )}

      {!isAdmin && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-primary/20 bg-white p-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-primary/80">Projetos ativos</p>
            <p className="mt-1 text-3xl font-semibold text-foreground">{activeProjects.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-white p-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Aprovacoes pendentes</p>
            <p className="mt-1 text-3xl font-semibold text-foreground">{clientPendingTotal}</p>
          </div>
          <div className="rounded-2xl border border-border bg-white p-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Proxima entrega</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {nextClientDeadline?.target_end_date ?? 'Sem data definida'}
            </p>
          </div>
        </div>
      )}

      {/* ── Main 2-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Projects carousel */}
          <section className="rounded-3xl border border-border bg-white p-5 backdrop-blur-md md:p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground">
                Projetos Ativos
                {activeProjects.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    ({activeProjects.length})
                  </span>
                )}
              </h2>
              {isAdmin && (
                <Link
                  href="/projects"
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  Ver todos <ChevronRight className="w-3 h-3" />
                </Link>
              )}
            </div>

            {activeProjects.length === 0 ? (
              <EmptyState
                icon={<FolderKanban className="w-10 h-10" />}
                title="Nenhum projeto ativo"
                description={isAdmin ? 'Crie um projeto para começar.' : 'Você ainda não tem projetos ativos.'}
                action={
                  isAdmin ? (
                    <Button asChild size="sm">
                      <Link href="/projects/new">Criar Projeto</Link>
                    </Button>
                  ) : undefined
                }
              />
            ) : isAdmin ? (
              <div className="flex gap-4 overflow-x-auto pb-3 snap-x scroll-smooth [scrollbar-width:thin] [scrollbar-color:hsl(var(--border))_transparent]">
                {activeProjects.map((project) => (
                  <div key={project.id} className="snap-start">
                    <ProjectFolderCard project={project} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project as Parameters<typeof ProjectCard>[0]['project']}
                    pendingClientTasks={pendingByProject[project.id] ?? 0}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Overdue projects */}
          {isAdmin && overdueProjects.length > 0 && (
            <section className="rounded-3xl border border-red-500/20 bg-red-500/5 p-5 backdrop-blur-md md:p-6">
              <h2 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Projetos Atrasados ({overdueProjects.length})
              </h2>
              <div className="bg-card border border-red-500/20 rounded-2xl overflow-hidden">
                {overdueProjects.map((project, idx) => {
                  const today = new Date().toISOString().split('T')[0]
                  const daysLate = project.target_end_date
                    ? Math.round(
                        (new Date(today).getTime() - new Date(project.target_end_date).getTime()) /
                          86400000,
                      )
                    : 0
                  return (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className={`flex items-center gap-3 px-4 py-3 hover:bg-red-500/5 transition-colors ${
                        idx > 0 ? 'border-t border-red-500/10' : ''
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                      <span className="flex-1 text-sm font-medium text-foreground truncate">
                        {project.name}
                      </span>
                      {project.clients && (
                        <span className="text-xs text-muted-foreground truncate hidden sm:block">
                          {(project.clients as { name: string }).name}
                        </span>
                      )}
                      <span className="text-xs font-semibold text-red-400 whitespace-nowrap">
                        {daysLate}d atraso
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {/* Team members */}
          {isAdmin && teamMembers.length > 0 && (
            <section className="rounded-3xl border border-border bg-white p-5 backdrop-blur-md md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  Equipe
                </h2>
                <Link
                  href="/team"
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  Gerenciar <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2 snap-x [scrollbar-width:thin] [scrollbar-color:hsl(var(--border))_transparent]">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="shrink-0 snap-start flex flex-col items-center gap-2 w-24"
                  >
                    {/* Avatar with ring */}
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full ring-4 ring-sidebar-border ring-offset-2 ring-offset-background overflow-hidden bg-primary/20 flex items-center justify-center">
                        {member.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={member.avatar_url}
                            alt={member.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-lg font-bold text-primary">
                            {member.full_name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
                          </span>
                        )}
                      </div>
                      {/* Online dot */}
                      <span className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-green-500 ring-2 ring-background" />
                    </div>
                    {/* Name + role */}
                    <div className="text-center">
                      <p className="text-xs font-semibold text-foreground leading-tight truncate w-24 text-center">
                        {member.full_name.split(' ')[0]} {member.full_name.split(' ').at(-1)?.[0]}.
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate w-24 text-center">
                        {member.company ?? 'Admin'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* RIGHT column — calendar + notice board */}
        {isAdmin && (
          <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
            <MiniCalendar taskDueDates={taskDueDates} />
            <NoticeBoard notices={notices} />
          </div>
        )}
      </div>
    </div>
  )
}
