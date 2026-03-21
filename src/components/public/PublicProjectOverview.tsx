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
  Link as LinkIcon,
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
      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="group rounded-[32px] border border-white/80 bg-white/40 backdrop-blur-xl p-8 shadow-[0_32px_80px_rgba(15,23,42,0.06)] transition-all duration-300 hover:bg-white/60">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <ProjectTypeBadge type={project.type} />
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/50 backdrop-blur-sm px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
              {statusLabel}
            </span>
            <HealthBadge health={project.health} size="sm" />
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Resumo executivo</p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                Momento atual do projeto
              </h2>
            </div>
            <p className="max-w-2xl text-[15px] leading-8 text-slate-600 font-medium">
              {executiveSummary(project, pendingClientTasks, pendingApprovals)}
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="group/card rounded-[24px] border border-white/80 bg-white/50 p-5 transition-all hover:bg-white hover:shadow-md">
              <div className="flex items-center gap-2 text-slate-500">
                <CalendarDays className="h-4 w-4 transition-colors group-hover/card:text-indigo-500" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Data de início</span>
              </div>
              <p className="mt-3 text-lg font-bold text-slate-950">
                {project.start_date
                  ? format(new Date(project.start_date), "d 'de' MMMM, yyyy", { locale: ptBR })
                  : 'Pendente'}
              </p>
            </div>

            <div className="group/card rounded-[24px] border border-white/80 bg-white/50 p-5 transition-all hover:bg-white hover:shadow-md">
              <div className="flex items-center gap-2 text-slate-500">
                <Target className="h-4 w-4 transition-colors group-hover/card:text-sky-500" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Entrega final</span>
              </div>
              <p className="mt-3 text-lg font-bold text-slate-950">
                {project.target_end_date
                  ? format(new Date(project.target_end_date), "d 'de' MMMM, yyyy", { locale: ptBR })
                  : 'A definir'}
              </p>
              {daysLeft != null && (
                <p className={`mt-1.5 text-xs font-bold ${daysLeft < 0 ? 'text-rose-600' : daysLeft <= 7 ? 'text-amber-600' : 'text-slate-500'}`}>
                  {daysLeft < 0
                    ? `${Math.abs(daysLeft)} dias de atraso`
                    : daysLeft === 0
                      ? 'Finaliza hoje'
                      : `${daysLeft} dias restantes`}
                </p>
              )}
            </div>
          </div>

          {project.project_link && (
            <div className="mt-4 rounded-[24px] border border-sky-100 bg-sky-50/60 p-5">
              <div className="flex items-center gap-2 text-sky-700">
                <LinkIcon className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Acesso rapido</span>
              </div>
              <a
                href={project.project_link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              >
                Abrir link do projeto
              </a>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex-1 rounded-[32px] border border-slate-800 bg-slate-950 p-8 text-white shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 blur-[60px]" />
             <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500/10 blur-[50px]" />
             
             <div className="relative z-10 space-y-8">
               <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Leitura ativa</p>
               
               <div className="space-y-6">
                  <div className="flex items-start gap-4 group/item">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 transition-colors group-hover/item:bg-white/20">
                      <ClipboardCheck className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-white tracking-tight">Decisões pendentes</p>
                      <p className="mt-1 text-xs text-slate-400 font-medium leading-relaxed">
                        {pendingClientTasks + pendingApprovals > 0
                          ? `${pendingClientTasks + pendingApprovals} item(ns) aguardando retorno imediato.`
                          : 'Seu projeto não possui pendências críticas hoje.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 group/item">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 transition-colors group-hover/item:bg-white/20">
                      <FolderKanban className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-white tracking-tight">Status da Entrega</p>
                      <p className="mt-1 text-xs text-slate-400 font-medium leading-relaxed">
                        Gerenciando {phaseCount} fases, {documentsCount} documentos e {activitiesCount} atualizações.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 group/item">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 transition-colors group-hover/item:bg-white/20">
                      <ShieldCheck className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-white tracking-tight">Portal de Transparência</p>
                      <p className="mt-1 text-xs text-slate-400 font-medium leading-relaxed">
                        Histórico e cronograma centralizados para seu acompanhamento direto.
                      </p>
                    </div>
                  </div>
               </div>
             </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-[32px] border border-sky-100 bg-sky-50/50 backdrop-blur-sm p-8 shadow-sm transition-all hover:bg-sky-50 hover:shadow-md">
          <div className="mb-6 flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-sm transition-transform hover:scale-105">
              <ArrowRight className="h-6 w-6" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-600/60">Evolução</p>
              <h3 className="text-xl font-bold tracking-tight text-slate-950">Próximos passos</h3>
            </div>
          </div>
          <p className="text-sm leading-8 text-slate-600 font-medium whitespace-pre-line">
            {textOrFallback(
              project.next_steps,
              'As proximas entregas e alinhamentos serao atualizados aqui conforme o projeto avanca.',
            )}
          </p>
        </div>

        <div className="rounded-[32px] border border-amber-100 bg-amber-50/50 backdrop-blur-sm p-8 shadow-sm transition-all hover:bg-amber-50 hover:shadow-md">
          <div className="mb-6 flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-amber-600 shadow-sm transition-transform hover:scale-105">
              <AlertTriangle className="h-6 w-6" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-600/60">Acompanhamento</p>
              <h3 className="text-xl font-bold tracking-tight text-slate-950">Riscos e pontos</h3>
            </div>
          </div>
          <p className="text-sm leading-8 text-slate-600 font-medium whitespace-pre-line">
            {textOrFallback(
              project.challenges,
              'No momento, nao ha impedimentos relevantes registrados para compartilhar com o cliente.',
            )}
          </p>
        </div>

        <div className="rounded-[32px] border border-slate-100 bg-white/60 backdrop-blur-sm p-8 shadow-sm transition-all hover:bg-white hover:shadow-md">
          <div className="mb-6 flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 shadow-sm transition-transform hover:scale-105">
              <BookOpen className="h-6 w-6" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Diretrizes</p>
              <h3 className="text-xl font-bold tracking-tight text-slate-950">Escopo geral</h3>
            </div>
          </div>
          <p className="text-sm leading-8 text-slate-600 font-medium whitespace-pre-line">
            {textOrFallback(
              project.scope_definition,
              'O escopo principal desta iniciativa sera consolidado e atualizado aqui sempre que houver refinamentos formais.',
            )}
          </p>
        </div>
      </section>

      <section className="rounded-[40px] border border-white/80 bg-white/40 backdrop-blur-xl p-8 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
        <div className="mb-8 flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
            <FileText className="h-6 w-6" />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Guia rápido</p>
            <h3 className="text-xl font-bold tracking-tight text-slate-950">Como usar este portal</h3>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="group rounded-[28px] border border-slate-100 bg-slate-50/50 p-6 transition-all hover:bg-white hover:shadow-md">
            <p className="text-sm font-bold text-slate-950 transition-colors group-hover:text-blue-600">1. Veja o que pede retorno</p>
            <p className="mt-2 text-sm text-slate-600 font-medium leading-relaxed">Priorize as abas de tarefas e aprovacoes quando houver pendencias.</p>
          </div>
          <div className="group rounded-[28px] border border-slate-100 bg-slate-50/50 p-6 transition-all hover:bg-white hover:shadow-md">
            <p className="text-sm font-bold text-slate-950 transition-colors group-hover:text-indigo-600">2. Consulte o cronograma</p>
            <p className="mt-2 text-sm text-slate-600 font-medium leading-relaxed">Acompanhe fases, previsao de entrega e evolucao do planejamento.</p>
          </div>
          <div className="group rounded-[28px] border border-slate-100 bg-slate-50/50 p-6 transition-all hover:bg-white hover:shadow-md">
            <p className="text-sm font-bold text-slate-950 transition-colors group-hover:text-violet-600">3. Centralize documentos</p>
            <p className="mt-2 text-sm text-slate-600 font-medium leading-relaxed">Use esta area para acessar materiais comerciais, operacionais e financeiros.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
