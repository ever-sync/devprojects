'use client'

import { useState, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  MessageSquare,
  RotateCcw,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { TASK_PRIORITY_CONFIG, TASK_STATUS_LABELS } from '@/lib/constants'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { approveTaskByToken, requestRevisionByToken } from '@/actions/public-portal'
import type { Task } from '@/types'

interface PublicTaskPanelProps {
  tasks: Task[]
  token: string
}

export function PublicTaskPanel({ tasks, token }: PublicTaskPanelProps) {
  const [localTasks, setLocalTasks] = useState(tasks)
  const [showDone, setShowDone] = useState(false)
  const [, startApprove] = useTransition()
  const [, startRevision] = useTransition()
  const [revisionTaskId, setRevisionTaskId] = useState<string | null>(null)
  const [revisionText, setRevisionText] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)

  const clientPending = localTasks.filter((task) => task.owner_type === 'client' && task.status !== 'done')
  const agencyActive = localTasks.filter(
    (task) => task.owner_type === 'agency' && (task.status === 'in_progress' || task.status === 'review')
  )
  const done = localTasks.filter((task) => task.status === 'done')

  function handleApprove(task: Task) {
    setProcessingId(task.id)
    startApprove(async () => {
      const result = await approveTaskByToken(token, task.id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Tarefa aprovada')
        setLocalTasks((prev) =>
          prev.map((item) => (item.id === task.id ? { ...item, status: 'done' as const } : item))
        )
      }
      setProcessingId(null)
    })
  }

  function handleRevisionSubmit(taskId: string) {
    if (!revisionText.trim()) {
      toast.error('Descreva o que precisa ser revisado')
      return
    }

    setProcessingId(taskId)
    startRevision(async () => {
      const result = await requestRevisionByToken(token, taskId, revisionText)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Revisao solicitada')
        setLocalTasks((prev) =>
          prev.map((item) => (item.id === taskId ? { ...item, status: 'todo' as const } : item))
        )
        setRevisionTaskId(null)
        setRevisionText('')
      }
      setProcessingId(null)
    })
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-[28px] border border-white/70 bg-white/85 px-6 py-16 text-center text-sm text-slate-500 shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
        Nenhuma tarefa cadastrada ainda.
      </div>
    )
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="group rounded-[32px] border border-white/80 bg-white/40 backdrop-blur-md px-5 py-6 shadow-[0_20px_50px_rgba(15,23,42,0.04)] transition-all hover:bg-white/60">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Sua ação</p>
          <p className="mt-3 text-3xl font-bold text-slate-950 group-hover:text-amber-600 transition-colors">{clientPending.length}</p>
          <p className="mt-1 text-xs font-medium text-slate-500">Itens aguardando retorno</p>
        </div>
        <div className="group rounded-[32px] border border-white/80 bg-white/40 backdrop-blur-md px-5 py-6 shadow-[0_20px_50px_rgba(15,23,42,0.04)] transition-all hover:bg-white/60">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Em execução</p>
          <p className="mt-3 text-3xl font-bold text-slate-950 group-hover:text-sky-600 transition-colors">{agencyActive.length}</p>
          <p className="mt-1 text-xs font-medium text-slate-500">Produção interna ativa</p>
        </div>
        <div className="group rounded-[32px] border border-white/80 bg-white/40 backdrop-blur-md px-5 py-6 shadow-[0_20px_50px_rgba(15,23,42,0.04)] transition-all hover:bg-white/60">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Finalizadas</p>
          <p className="mt-3 text-3xl font-bold text-slate-950 group-hover:text-emerald-600 transition-colors">{done.length}</p>
          <p className="mt-1 text-xs font-medium text-slate-500">Aprovadas com sucesso</p>
        </div>
      </div>

      <section className="rounded-[40px] border border-white/80 bg-white/40 backdrop-blur-xl p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)] sm:p-8">
        <div className="mb-6 flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
            <AlertCircle className="h-6 w-6" />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Fila de espera</p>
            <h3 className="text-xl font-bold tracking-tight text-slate-950">Aguardando sua decisão</h3>
          </div>
        </div>

        {clientPending.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-slate-50/80 px-5 py-10 text-center text-sm text-slate-500">
            Nenhuma tarefa pendente. O projeto esta em dia neste momento.
          </div>
        ) : (
          <div className="space-y-4">
            {clientPending.map((task) => {
              const priorityConfig = TASK_PRIORITY_CONFIG[task.priority]
              const isProcessing = processingId === task.id
              const isRevisionOpen = revisionTaskId === task.id

              return (
                <div key={task.id} className="group overflow-hidden rounded-[32px] border border-amber-200/50 bg-white/60 transition-all duration-300 hover:bg-white/90 hover:shadow-lg">
                  <div className="flex flex-col gap-5 px-6 py-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-lg font-bold tracking-tight text-slate-950">{task.title}</span>
                        {priorityConfig && (
                          <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${priorityConfig.color} bg-white/50 backdrop-blur-sm`}>
                            {priorityConfig.label}
                          </span>
                        )}
                      </div>

                      {task.description && !task.description.startsWith('[Revis') && (
                        <p className="max-w-2xl text-sm leading-7 text-slate-600 font-medium">{task.description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100/50 px-3 py-1.5 text-[11px] font-semibold text-slate-600">
                          <Clock className="h-3.5 w-3.5" />
                          {TASK_STATUS_LABELS[task.status] ?? task.status}
                        </span>
                        {task.due_date && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50/50 px-3 py-1.5 text-[11px] font-semibold text-indigo-600">
                            <Clock className="h-3.5 w-3.5" />
                            Entrega: {format(new Date(task.due_date), "d 'de' MMM", { locale: ptBR })}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 sm:shrink-0 sm:items-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isProcessing}
                        onClick={() => {
                          setRevisionTaskId(isRevisionOpen ? null : task.id)
                          setRevisionText('')
                        }}
                        className="h-11 flex-1 sm:flex-none rounded-2xl border border-slate-200 bg-white px-5 text-xs font-bold text-slate-600 transition-all hover:bg-slate-50 sm:w-auto"
                      >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Revisar
                      </Button>
                      <Button
                        size="sm"
                        disabled={isProcessing}
                        onClick={() => handleApprove(task)}
                        className="h-11 flex-1 sm:flex-none rounded-2xl bg-slate-950 px-6 text-xs font-bold text-white transition-all hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-950/20 sm:w-auto"
                      >
                        {isProcessing && !isRevisionOpen ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                        )}
                        Aprovar
                      </Button>
                    </div>
                  </div>

                  {isRevisionOpen && (
                    <div className="border-t border-amber-200/80 bg-white/80 px-4 py-4 sm:px-5">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="flex items-center gap-2 text-sm font-medium text-slate-700">
                          <RotateCcw className="h-4 w-4 text-amber-600" />
                          Informe o que precisa ser ajustado
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setRevisionTaskId(null)
                            setRevisionText('')
                          }}
                          className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <textarea
                        value={revisionText}
                        onChange={(event) => setRevisionText(event.target.value)}
                        placeholder="Descreva o ponto que precisa de revisao..."
                        rows={4}
                        autoFocus
                        className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                      />

                      <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRevisionTaskId(null)
                            setRevisionText('')
                          }}
                          disabled={isProcessing}
                          className="h-10 w-full rounded-full px-4 text-xs sm:w-auto"
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          disabled={isProcessing || !revisionText.trim()}
                          onClick={() => handleRevisionSubmit(task.id)}
                          className="h-10 w-full rounded-full bg-amber-600 px-4 text-xs text-white hover:bg-amber-700 sm:w-auto"
                        >
                          {isProcessing ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                          )}
                          Enviar revisao
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {agencyActive.length > 0 && (
        <section className="rounded-[24px] border border-white/70 bg-white/85 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.05)] sm:rounded-[28px] sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
              <Clock className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Andamento</p>
              <h3 className="text-lg font-semibold tracking-[-0.03em] text-slate-950">Em progresso pela equipe</h3>
            </div>
          </div>

          <div className="space-y-3">
            {agencyActive.map((task) => (
              <Card key={task.id} className="rounded-3xl border-slate-200/80 bg-slate-50/75 px-4 py-4 shadow-none">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-sky-600">
                    <Clock className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{task.title}</p>
                    <p className="text-xs text-slate-500">{TASK_STATUS_LABELS[task.status] ?? task.status}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {done.length > 0 && (
        <section className="rounded-[24px] border border-white/70 bg-white/85 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.05)] sm:rounded-[28px] sm:p-6">
          <button
            type="button"
            onClick={() => setShowDone((value) => !value)}
            className="flex w-full items-center justify-between gap-3 rounded-2xl bg-slate-50/80 px-4 py-3 text-left transition-colors hover:bg-slate-100/80"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Historico</p>
                <h3 className="text-lg font-semibold tracking-[-0.03em] text-slate-950">Aprovadas e concluidas</h3>
              </div>
            </div>
            <div className="flex items-center gap-3 text-slate-500">
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium">{done.length}</span>
              {showDone ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </div>
          </button>

          {showDone && (
            <div className="mt-4 space-y-3">
              {done.map((task) => (
                <Card key={task.id} className="rounded-3xl border-slate-200/80 bg-slate-50/75 px-4 py-4 shadow-none">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                    <p className="truncate text-sm font-medium text-slate-700 line-through">{task.title}</p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
