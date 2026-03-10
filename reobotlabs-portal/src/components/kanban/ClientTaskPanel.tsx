'use client'

import { useState } from 'react'
import { updateTaskStatus } from '@/actions/tasks'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  MessageSquare,
} from 'lucide-react'
import { TASK_PRIORITY_CONFIG, TASK_STATUS_LABELS } from '@/lib/constants'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { TaskComments } from './TaskComments'
import type { Task } from '@/types'

interface ClientTaskPanelProps {
  projectId: string
  currentUserId: string
  tasks: Task[]
}

export function ClientTaskPanel({ projectId, currentUserId, tasks }: ClientTaskPanelProps) {
  const [localTasks, setLocalTasks] = useState(tasks)
  const [showDone, setShowDone] = useState(false)
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)

  const clientPending = localTasks.filter(
    (t) => t.owner_type === 'client' && t.status !== 'done'
  )
  const agencyActive = localTasks.filter(
    (t) => t.owner_type === 'agency' && (t.status === 'in_progress' || t.status === 'review')
  )
  const done = localTasks.filter((t) => t.status === 'done')

  async function handleApprove(task: Task) {
    setLocalTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: 'done' as const } : t))
    )
    await updateTaskStatus(task.id, 'done', projectId)
  }

  function toggleExpand(taskId: string) {
    setExpandedTaskId((prev) => (prev === taskId ? null : taskId))
  }

  return (
    <div className="space-y-6 mt-4">
      {/* Aguardando ação do cliente */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="w-4 h-4 text-yellow-500" />
          <h3 className="font-semibold text-foreground text-sm">Aguardando sua ação</h3>
          {clientPending.length > 0 && (
            <span className="inline-flex items-center rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-500">
              {clientPending.length}
            </span>
          )}
        </div>

        {clientPending.length === 0 ? (
          <div className="rounded-lg border border-border/50 bg-card/50 px-4 py-8 text-center text-sm text-muted-foreground">
            Nenhuma tarefa pendente — tudo em dia!
          </div>
        ) : (
          <div className="space-y-2">
            {clientPending.map((task) => {
              const priorityConfig = TASK_PRIORITY_CONFIG[task.priority]
              const isExpanded = expandedTaskId === task.id
              return (
                <div key={task.id} className="rounded-xl border border-border overflow-hidden">
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-sm font-medium text-foreground truncate">
                          {task.title}
                        </span>
                        {priorityConfig && (
                          <span className={`text-xs font-medium ${priorityConfig.color}`}>
                            {priorityConfig.label}
                          </span>
                        )}
                      </div>
                      {task.due_date && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(task.due_date), "d 'de' MMM", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleExpand(task.id)}
                        title="Ver comentários"
                        className={`p-1.5 rounded-lg border transition-colors ${
                          isExpanded
                            ? 'border-primary/30 bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApprove(task)}
                        className="shrink-0 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                        Aprovar
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border bg-muted/20 px-4 py-4">
                      <TaskComments
                        taskId={task.id}
                        projectId={projectId}
                        currentUserId={currentUserId}
                        isAdmin={false}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Em progresso pela equipe */}
      {agencyActive.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-blue-400" />
            <h3 className="font-semibold text-foreground text-sm">Em progresso pela equipe</h3>
            <span className="inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400">
              {agencyActive.length}
            </span>
          </div>
          <div className="space-y-2">
            {agencyActive.map((task) => {
              const isExpanded = expandedTaskId === task.id
              return (
                <div key={task.id} className="rounded-xl border border-border/50 overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 opacity-75">
                    <Clock className="w-4 h-4 text-blue-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {TASK_STATUS_LABELS[task.status] ?? task.status}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleExpand(task.id)}
                      title="Ver comentários"
                      className={`p-1.5 rounded-lg border transition-colors ${
                        isExpanded
                          ? 'border-primary/30 bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-border bg-muted/20 px-4 py-4">
                      <TaskComments
                        taskId={task.id}
                        projectId={projectId}
                        currentUserId={currentUserId}
                        isAdmin={false}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Concluídas */}
      {done.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            className="flex items-center gap-2 mb-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showDone ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            <h3 className="font-semibold text-sm">Concluídas</h3>
            <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
              {done.length}
            </span>
          </button>
          {showDone && (
            <div className="space-y-2">
              {done.map((task) => (
                <Card
                  key={task.id}
                  className="flex items-center gap-3 px-4 py-3 border-border/50 opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  <p className="text-sm text-foreground line-through truncate">{task.title}</p>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
