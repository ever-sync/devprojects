import { differenceInDays, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  FileText,
  FolderKanban,
  ShieldCheck,
  Target,
} from 'lucide-react'
import { HealthBadge } from '@/components/dashboard/HealthBadge'
import { ProjectTypeBadge } from '@/components/projects/ProjectTypeBadge'
import type { Project } from '@/types'

interface PublicProjectOverviewProps {
  project: Project
  pendingClientTasks: number
  pendingApprovals: number
  documentsCount: number
  phaseCount: number
  activitiesCount: number
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  paused: 'Pausado',
  completed: 'Concluido',
  cancelled: 'Cancelado',
}

function textOrFallback(content: string | null, fallback: string) {
  if (!content || !content.trim()) return fallback
  return content
}

function executiveSummary(project: Project, pendingClientTasks: number, pendingApprovals: number) {
  const actionLoad = pendingClientTasks + pendingApprovals

  if (project.health === 'red') {
    return 'Existem pontos sensiveis no andamento. Vale acompanhar as proximas atualizacoes e validacoes pendentes.'
  }

  if (actionLoad > 0) {
    return 'O projeto esta avancando, mas existe retorno pendente do cliente para manter o fluxo sem atrasos.'
  }

  if (project.progress_percent >= 80) {
    return 'O projeto esta em fase final, com foco em consolidacao, validacao e fechamento das ultimas entregas.'
  }

  if (project.progress_percent >= 35) {
    return 'O projeto segue em execucao com entregas em andamento e previsibilidade de proximos passos.'
  }

  return 'O projeto esta em fase de estruturacao e ganho de tracao, com visibilidade clara sobre entregas e cronograma.'
}

export function PublicProjectOverview({
  project,
  pendingClientTasks,
  pendingApprovals,
  documentsCount,
  phaseCount,
  activitiesCount,
}: PublicProjectOverviewProps) {
  const daysLeft = project.target_end_date
    ? differenceInDays(new Date(project.target_end_date), new Date())
    : null
  const statusLabel = STATUS_LABELS[project.status] ?? project.status

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.45fr_0.9fr]">
        <div className="rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] p-5 sm:rounded-[28px] sm:p-6">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <ProjectTypeBadge type={project.type} />
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              {statusLabel}
            </span>
            <HealthBadge health={project.health} size="sm" />
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Resumo executivo</p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-2xl">
                Visao clara do momento atual do projeto
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-slate-600">
              {executiveSummary(project, pendingClientTasks, pendingApprovals)}
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4">
              <div className="flex items-center gap-2 text-slate-500">
                <CalendarDays className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-[0.16em]">Inicio</span>
              </div>
              <p className="mt-3 text-base font-semibold text-slate-950">
                {project.start_date
                  ? format(new Date(project.start_date), "d 'de' MMM, yyyy", { locale: ptBR })
                  : 'Nao definido'}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4">
              <div className="flex items-center gap-2 text-slate-500">
                <Target className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-[0.16em]">Entrega prevista</span>
              </div>
              <p className="mt-3 text-base font-semibold text-slate-950">
                {project.target_end_date
                  ? format(new Date(project.target_end_date), "d 'de' MMM, yyyy", { locale: ptBR })
                  : 'Sem prazo definido'}
              </p>
              {daysLeft != null && (
                <p className={`mt-1 text-sm ${daysLeft < 0 ? 'text-rose-500' : daysLeft <= 7 ? 'text-amber-500' : 'text-slate-500'}`}>
                  {daysLeft < 0
                    ? `${Math.abs(daysLeft)} dias de atraso`
                    : daysLeft === 0
                      ? 'Entrega prevista para hoje'
                      : `${daysLeft} dias restantes`}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200/80 bg-slate-950 p-5 text-white sm:rounded-[28px] sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Leitura rapida</p>
          <div className="mt-5 space-y-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10">
                <ClipboardCheck className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-white">Pendencias do cliente</p>
                <p className="text-sm text-slate-300">
                  {pendingClientTasks + pendingApprovals > 0
                    ? `${pendingClientTasks + pendingApprovals} item(ns) aguardando decisao ou retorno.`
                    : 'Nenhuma pendencia critica neste momento.'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10">
                <FolderKanban className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-white">Estrutura do projeto</p>
                <p className="text-sm text-slate-300">
                  {phaseCount} fase(s), {documentsCount} documento(s) e {activitiesCount} atualizacao(oes) registradas.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-white">Transparencia de acompanhamento</p>
                <p className="text-sm text-slate-300">
                  Este portal concentra entregas, aprovacoes, cronograma e historico para consulta direta do cliente.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-[24px] border border-sky-200/80 bg-sky-50/70 p-5 sm:rounded-[28px] sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sky-700">
              <ArrowRight className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700/60">Proximo movimento</p>
              <h3 className="text-lg font-semibold tracking-[-0.03em] text-slate-950">Proximos passos</h3>
            </div>
          </div>
          <p className="text-sm leading-7 text-slate-700 whitespace-pre-line">
            {textOrFallback(
              project.next_steps,
              'As proximas entregas e alinhamentos serao atualizados aqui conforme o projeto avanca.',
            )}
          </p>
        </div>

        <div className="rounded-[24px] border border-amber-200/80 bg-amber-50/70 p-5 sm:rounded-[28px] sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-amber-700">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700/60">Ponto de atencao</p>
              <h3 className="text-lg font-semibold tracking-[-0.03em] text-slate-950">Riscos e impedimentos</h3>
            </div>
          </div>
          <p className="text-sm leading-7 text-slate-700 whitespace-pre-line">
            {textOrFallback(
              project.challenges,
              'No momento, nao ha impedimentos relevantes registrados para compartilhar com o cliente.',
            )}
          </p>
        </div>

        <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-5 sm:rounded-[28px] sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-slate-700">
              <BookOpen className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Base do projeto</p>
              <h3 className="text-lg font-semibold tracking-[-0.03em] text-slate-950">Escopo validado</h3>
            </div>
          </div>
          <p className="text-sm leading-7 text-slate-700 whitespace-pre-line">
            {textOrFallback(
              project.scope_definition,
              'O escopo principal desta iniciativa sera consolidado e atualizado aqui sempre que houver refinamentos formais.',
            )}
          </p>
        </div>
      </section>

      <section className="rounded-[24px] border border-slate-200/80 bg-white/90 p-5 sm:rounded-[28px] sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-slate-700">
            <FileText className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Como usar este portal</p>
            <h3 className="text-lg font-semibold tracking-[-0.03em] text-slate-950">Leitura recomendada</h3>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
            <p className="text-sm font-medium text-slate-900">1. Veja o que pede retorno</p>
            <p className="mt-1 text-sm text-slate-600">Priorize as abas de tarefas e aprovacoes quando houver pendencias.</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
            <p className="text-sm font-medium text-slate-900">2. Consulte o cronograma</p>
            <p className="mt-1 text-sm text-slate-600">Acompanhe fases, previsao de entrega e evolucao do planejamento.</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
            <p className="text-sm font-medium text-slate-900">3. Centralize documentos</p>
            <p className="mt-1 text-sm text-slate-600">Use esta area para acessar materiais comerciais, operacionais e financeiros.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
