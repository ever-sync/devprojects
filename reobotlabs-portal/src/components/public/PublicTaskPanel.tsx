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
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-3xl border border-white/70 bg-white/85 px-4 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Sua acao</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{clientPending.length}</p>
          <p className="mt-1 text-sm text-slate-500">Itens aguardando retorno</p>
        </div>
        <div className="rounded-3xl border border-white/70 bg-white/85 px-4 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Equipe em execucao</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{agencyActive.length}</p>
          <p className="mt-1 text-sm text-slate-500">Tarefas em andamento interno</p>
        </div>
        <div className="rounded-3xl border border-white/70 bg-white/85 px-4 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Entregas concluidas</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{done.length}</p>
          <p className="mt-1 text-sm text-slate-500">Aprovadas ou finalizadas</p>
        </div>
      </div>

      <section className="rounded-[24px] border border-white/70 bg-white/85 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.05)] sm:rounded-[28px] sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <AlertCircle className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Prioridade</p>
            <h3 className="text-lg font-semibold tracking-[-0.03em] text-slate-950">Aguardando sua acao</h3>
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
                <div key={task.id} className="overflow-hidden rounded-3xl border border-amber-200/70 bg-[linear-gradient(180deg,rgba(255,251,235,0.96),rgba(255,255,255,0.98))]">
                  <div className="flex flex-col gap-4 px-4 py-4 sm:px-5 sm:py-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="text-base font-semibold tracking-[-0.02em] text-slate-950">{task.title}</span>
                        {priorityConfig && (
                          <span className={`rounded-full border border-current/10 px-2.5 py-1 text-[11px] font-semibold ${priorityConfig.color}`}>
                            {priorityConfig.label}
                          </span>
                        )}
                      </div>

                      {task.description && !task.description.startsWith('[Revis') && (
                        <p className="max-w-2xl text-sm leading-6 text-slate-600">{task.description}</p>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1">
                          <Clock className="h-3.5 w-3.5" />
                          {TASK_STATUS_LABELS[task.status] ?? task.status}
                        </span>
                        {task.due_date && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1">
                            <Clock className="h-3.5 w-3.5" />
                            {format(new Date(task.due_date), "d 'de' MMM", { locale: ptBR })}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid shrink-0 gap-2 sm:flex sm:flex-wrap sm:items-center">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isProcessing}
                        onClick={() => {
                          setRevisionTaskId(isRevisionOpen ? null : task.id)
                          setRevisionText('')
                        }}
                        className="h-10 w-full rounded-full border-amber-300 bg-white px-4 text-xs text-amber-700 hover:bg-amber-50 sm:w-auto"
                      >
                        <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                        Solicitar revisao
                      </Button>
                      <Button
                        size="sm"
                        disabled={isProcessing}
                        onClick={() => handleApprove(task)}
                        className="h-10 w-full rounded-full bg-slate-950 px-4 text-xs text-white hover:bg-slate-800 sm:w-auto"
                      >
                        {isProcessing && !isRevisionOpen ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Aprovar entrega
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
