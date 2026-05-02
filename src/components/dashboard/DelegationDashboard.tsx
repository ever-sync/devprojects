'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { AlertTriangle, Clock, CheckCircle2, User, Search, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type Task = {
  id: string
  title: string
  status: string
  priority: string
  updated_at: string
  project_id: string
  project_name: string
  assignee: {
    id: string
    full_name: string
    email: string
  } | null
}

const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'A Fazer',
  in_progress: 'Em Progresso',
  review: 'Em Revisão',
  done: 'Concluído',
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  low: 'bg-muted text-muted-foreground',
}

const STATUS_COLORS: Record<string, string> = {
  backlog: 'bg-secondary text-secondary-foreground',
  todo: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  in_progress: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  review: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  done: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200',
}

// Task parada há mais de 2 dias = alerta
const STALE_THRESHOLD_MS = 2 * 24 * 60 * 60 * 1000

function isStale(task: Task): boolean {
  if (task.status === 'done') return false
  return Date.now() - new Date(task.updated_at).getTime() > STALE_THRESHOLD_MS
}

interface Props {
  tasks: Task[]
}

export function DelegationDashboard({ tasks }: Props) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('active')

  // Agrupar por assignee
  const grouped = tasks.reduce<Record<string, { assignee: Task['assignee']; tasks: Task[] }>>((acc, task) => {
    const key = task.assignee?.id ?? '__unassigned__'
    if (!acc[key]) {
      acc[key] = { assignee: task.assignee, tasks: [] }
    }
    acc[key].tasks.push(task)
    return acc
  }, {})

  const filteredGroups = Object.entries(grouped)
    .map(([key, group]) => {
      const filteredTasks = group.tasks.filter((task) => {
        const matchesSearch = !search || task.title.toLowerCase().includes(search.toLowerCase()) || task.project_name.toLowerCase().includes(search.toLowerCase())
        const matchesStatus = statusFilter === 'all'
          ? true
          : statusFilter === 'active'
          ? task.status !== 'done'
          : statusFilter === 'stale'
          ? isStale(task)
          : task.status === statusFilter
        return matchesSearch && matchesStatus
      })
      return { key, assignee: group.assignee, tasks: filteredTasks }
    })
    .filter(g => g.tasks.length > 0)
    .sort((a, b) => {
      // Grupos com tarefas paradas primeiro
      const aStale = a.tasks.filter(isStale).length
      const bStale = b.tasks.filter(isStale).length
      return bStale - aStale
    })

  const totalActive = tasks.filter(t => t.status !== 'done').length
  const totalStale = tasks.filter(isStale).length
  const totalDone = tasks.filter(t => t.status === 'done').length

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-muted-foreground">Em Andamento</span>
          </div>
          <p className="text-2xl font-bold">{totalActive}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-muted-foreground">Paradas (+2 dias)</span>
          </div>
          <p className="text-2xl font-bold text-yellow-600">{totalStale}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-sm text-muted-foreground">Concluídas</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{totalDone}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tarefa ou projeto..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {[
            { value: 'active', label: 'Ativas' },
            { value: 'stale', label: 'Paradas' },
            { value: 'done', label: 'Concluídas' },
            { value: 'all', label: 'Todas' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                statusFilter === f.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grupos por responsável */}
      {filteredGroups.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <User className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Nenhuma tarefa encontrada com esses filtros.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredGroups.map(({ key, assignee, tasks: groupTasks }) => {
            const staleCount = groupTasks.filter(isStale).length
            return (
              <div key={key} className="space-y-2">
                {/* Cabeçalho do responsável */}
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                    {assignee ? assignee.full_name.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div>
                    <span className="font-medium text-sm">
                      {assignee ? assignee.full_name : 'Sem Responsável'}
                    </span>
                    {assignee && (
                      <span className="text-xs text-muted-foreground ml-2">{assignee.email}</span>
                    )}
                  </div>
                  <Badge variant="secondary" className="ml-1">
                    {groupTasks.length} {groupTasks.length === 1 ? 'tarefa' : 'tarefas'}
                  </Badge>
                  {staleCount > 0 && (
                    <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {staleCount} parada{staleCount > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>

                {/* Tarefas */}
                <div className="rounded-lg border divide-y ml-11">
                  {groupTasks.map((task) => {
                    const stale = isStale(task)
                    return (
                      <div
                        key={task.id}
                        className={`flex items-center justify-between px-4 py-3 ${stale ? 'bg-yellow-50/50 dark:bg-yellow-950/20' : ''}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {stale && <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />}
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{task.title}</p>
                            <p className="text-xs text-muted-foreground">{task.project_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-4">
                          <Badge className={`text-xs ${PRIORITY_COLORS[task.priority]}`}>
                            {task.priority}
                          </Badge>
                          <Badge className={`text-xs ${STATUS_COLORS[task.status]}`}>
                            {STATUS_LABELS[task.status] ?? task.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground hidden md:inline" title={task.updated_at}>
                            {formatDistanceToNow(new Date(task.updated_at), { locale: ptBR, addSuffix: true })}
                          </span>
                          <Link
                            href={`/projects/${task.project_id}/tasks`}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
