'use client'

import { useMemo, useState, useTransition } from 'react'
import { DndContext, DragOverlay, PointerSensor, closestCorners, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { toast } from 'sonner'
import { addDays, differenceInDays, format, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { reassignTaskAllocation, updateTaskDueDateAllocation } from '@/actions/execution'

type AllocationTask = {
  id: string
  title: string
  project_id: string
  project_name: string
  assignee_id: string | null
  status: string
  priority: string
  due_date: string | null
  remaining_hours: number | null
  estimated_hours: number | null
  actual_hours: number | null
}

interface ResourceAllocationBoardProps {
  teamMembers: Array<{ id: string; full_name: string }>
  tasks: AllocationTask[]
  focusedMemberId?: string | null
}

const PRIORITY_WEIGHT: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
}

function hoursFromTask(task: AllocationTask) {
  const fallback =
    task.estimated_hours != null ? Math.max(task.estimated_hours - (task.actual_hours ?? 0), 0) : 0
  return task.remaining_hours ?? fallback
}

function taskSort(a: AllocationTask, b: AllocationTask) {
  const priorityDelta = (PRIORITY_WEIGHT[a.priority] ?? 99) - (PRIORITY_WEIGHT[b.priority] ?? 99)
  if (priorityDelta !== 0) return priorityDelta

  const dueA = a.due_date ? Date.parse(`${a.due_date}T12:00:00.000Z`) : Number.MAX_SAFE_INTEGER
  const dueB = b.due_date ? Date.parse(`${b.due_date}T12:00:00.000Z`) : Number.MAX_SAFE_INTEGER
  if (dueA !== dueB) return dueA - dueB

  return a.title.localeCompare(b.title)
}

function TaskCard({ task, dragging = false }: { task: AllocationTask; dragging?: boolean }) {
  const hours =
    task.remaining_hours ??
    (task.estimated_hours != null ? Math.max(task.estimated_hours - (task.actual_hours ?? 0), 0) : 0)

  return (
    <div className={`rounded-lg border border-border bg-card p-3 ${dragging ? 'opacity-70' : ''}`}>
      <p className="text-sm font-medium text-foreground">{task.title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{task.project_name}</p>
      <div className="mt-2 flex items-center gap-2">
        <Badge variant="outline">{task.priority}</Badge>
        <Badge variant="secondary">{task.status}</Badge>
        <span className="text-xs text-muted-foreground">{hours.toFixed(1)}h</span>
      </div>
    </div>
  )
}

function DraggableTask({ task }: { task: AllocationTask }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { taskId: task.id },
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing">
      <TaskCard task={task} dragging={isDragging} />
    </div>
  )
}

function AllocationLane({
  laneId,
  title,
  tasks,
}: {
  laneId: string
  title: string
  tasks: AllocationTask[]
}) {
  const { setNodeRef, isOver } = useDroppable({ id: laneId })
  const totalHours = tasks.reduce((sum, task) => sum + hoursFromTask(task), 0)
  const workloadState = totalHours > 48 ? 'overloaded' : totalHours >= 32 ? 'warning' : 'healthy'
  const workloadBadgeClass =
    workloadState === 'overloaded'
      ? 'bg-red-500/10 text-red-600 border-red-500/20'
      : workloadState === 'warning'
        ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
        : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
  const orderedTasks = [...tasks].sort(taskSort)

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border p-3 transition-colors ${
        isOver ? 'border-primary bg-primary/5' : 'border-border bg-background'
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {tasks.length} tasks · {totalHours.toFixed(1)}h
          </span>
          <Badge className={workloadBadgeClass}>
            {workloadState === 'overloaded' ? 'Sobrecarga' : workloadState === 'warning' ? 'Atencao' : 'Saudavel'}
          </Badge>
        </div>
      </div>
      <div className="space-y-2 min-h-20">
        {orderedTasks.map((task) => (
          <DraggableTask key={task.id} task={task} />
        ))}
      </div>
    </div>
  )
}

export function ResourceAllocationBoard({ teamMembers, tasks, focusedMemberId }: ResourceAllocationBoardProps) {
  const [boardTasks, setBoardTasks] = useState(tasks)
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [view, setView] = useState<'board' | 'timeline'>('board')
  const [editingDueDateByTask, setEditingDueDateByTask] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const visibleMembers = focusedMemberId
    ? teamMembers.filter((member) => member.id === focusedMemberId)
    : teamMembers

  const lanes = useMemo(() => {
    const map = new Map<string, AllocationTask[]>()
    map.set('assignee::unassigned', boardTasks.filter((task) => !task.assignee_id))
    for (const member of visibleMembers) {
      map.set(`assignee::${member.id}`, boardTasks.filter((task) => task.assignee_id === member.id))
    }
    return map
  }, [boardTasks, visibleMembers])

  const activeTask = boardTasks.find((task) => task.id === activeTaskId) ?? null
  const timelineWeeks = 8
  const timelineStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const timelineEnd = addDays(timelineStart, timelineWeeks * 7 - 1)

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveTaskId(null)
    if (!over) return

    const taskId = String(active.id)
    const overId = String(over.id)
    if (!overId.startsWith('assignee::')) return

    const rawAssignee = overId.split('::')[1]
    const nextAssigneeId = rawAssignee === 'unassigned' ? null : rawAssignee
    const previousTask = boardTasks.find((task) => task.id === taskId)
    if (!previousTask) return
    if ((previousTask.assignee_id ?? null) === nextAssigneeId) return

    setBoardTasks((prev) =>
      prev.map((task) => (task.id === taskId ? { ...task, assignee_id: nextAssigneeId } : task)),
    )

    startTransition(async () => {
      const result = await reassignTaskAllocation(taskId, nextAssigneeId)
      if (result.error) {
        setBoardTasks((prev) =>
          prev.map((task) => (task.id === taskId ? { ...task, assignee_id: previousTask.assignee_id } : task)),
        )
        toast.error(result.error)
        return
      }
      toast.success('Alocacao atualizada')
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Resource Allocation (drag & drop)</CardTitle>
            <CardDescription>
              Arraste tarefas entre pessoas para redistribuir capacidade da equipe.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={view === 'board' ? 'secondary' : 'outline'} size="sm" onClick={() => setView('board')}>
              Board
            </Button>
            <Button variant={view === 'timeline' ? 'secondary' : 'outline'} size="sm" onClick={() => setView('timeline')}>
              Timeline
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {view === 'board' ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={(event) => setActiveTaskId(String(event.active.id))}
            onDragEnd={onDragEnd}
          >
            <div className="grid gap-3 lg:grid-cols-4">
              <AllocationLane
                laneId="assignee::unassigned"
                title="Sem responsavel"
                tasks={lanes.get('assignee::unassigned') ?? []}
              />
              {visibleMembers.map((member) => (
                <AllocationLane
                  key={member.id}
                  laneId={`assignee::${member.id}`}
                  title={member.full_name}
                  tasks={lanes.get(`assignee::${member.id}`) ?? []}
                />
              ))}
            </div>

            <DragOverlay>
              {activeTask ? <TaskCard task={activeTask} dragging /> : null}
            </DragOverlay>
          </DndContext>
        ) : (
          <div className="space-y-4">
            <div className="text-xs text-muted-foreground">
              Janela: {format(timelineStart, "d MMM", { locale: ptBR })} - {format(timelineEnd, "d MMM", { locale: ptBR })}
            </div>
            <div className="space-y-3">
              {visibleMembers.map((member) => {
                const memberTasks = boardTasks.filter((task) => task.assignee_id === member.id)
                const dueTasks = memberTasks.filter((task) => task.due_date)
                const noDueTasks = memberTasks.filter((task) => !task.due_date)
                return (
                  <div key={member.id} className="rounded-xl border border-border p-3">
                    <p className="mb-2 text-sm font-semibold">{member.full_name}</p>
                    <div className="relative h-14 rounded-lg bg-muted/40">
                      {dueTasks.map((task) => {
                        const due = new Date(`${task.due_date}T12:00:00.000Z`)
                        const offset = differenceInDays(due, timelineStart)
                        const clamped = Math.max(0, Math.min(offset, timelineWeeks * 7 - 1))
                        const left = (clamped / (timelineWeeks * 7)) * 100
                        const editValue = editingDueDateByTask[task.id] ?? (task.due_date ?? '')
                        return (
                          <div
                            key={task.id}
                            className="absolute top-2 -translate-x-1/2 rounded-md border border-border bg-card px-2 py-1 text-[11px] shadow-sm"
                            style={{ left: `${left}%`, maxWidth: '220px', minWidth: '190px' }}
                            title={`${task.title} (${task.project_name})`}
                          >
                            <p className="truncate font-medium">{task.title}</p>
                            <p className="truncate text-muted-foreground">{format(due, "d/MM", { locale: ptBR })}</p>
                            <div className="mt-1 flex items-center gap-1">
                              <Input
                                type="date"
                                value={editValue}
                                onChange={(event) =>
                                  setEditingDueDateByTask((prev) => ({ ...prev, [task.id]: event.target.value }))
                                }
                                className="h-6 px-1 text-[10px]"
                              />
                              <Button
                                size="sm"
                                className="h-6 px-2 text-[10px]"
                                onClick={() => {
                                  const nextDueDate = (editingDueDateByTask[task.id] ?? task.due_date ?? '') || null
                                  const previousDueDate = task.due_date
                                  setBoardTasks((prev) =>
                                    prev.map((item) =>
                                      item.id === task.id ? { ...item, due_date: nextDueDate } : item,
                                    ),
                                  )
                                  startTransition(async () => {
                                    const result = await updateTaskDueDateAllocation(task.id, nextDueDate)
                                    if (result.error) {
                                      setBoardTasks((prev) =>
                                        prev.map((item) =>
                                          item.id === task.id ? { ...item, due_date: previousDueDate } : item,
                                        ),
                                      )
                                      toast.error(result.error)
                                      return
                                    }
                                    toast.success('Prazo atualizado')
                                  })
                                }}
                              >
                                Salvar
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {noDueTasks.length > 0 && (
                      <div className="mt-2 space-y-2">
                        <p className="text-[11px] font-medium text-muted-foreground">Sem prazo</p>
                        {noDueTasks.map((task) => {
                          const editValue = editingDueDateByTask[task.id] ?? ''
                          return (
                            <div key={task.id} className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-border p-2">
                              <Badge variant="outline">{task.title}</Badge>
                              <Input
                                type="date"
                                value={editValue}
                                onChange={(event) =>
                                  setEditingDueDateByTask((prev) => ({ ...prev, [task.id]: event.target.value }))
                                }
                                className="h-7 w-[170px] px-1 text-[11px]"
                              />
                              <Button
                                size="sm"
                                className="h-7 px-2 text-[11px]"
                                onClick={() => {
                                  const selected = editingDueDateByTask[task.id] ?? ''
                                  if (!selected) {
                                    toast.error('Selecione uma data')
                                    return
                                  }
                                  setBoardTasks((prev) =>
                                    prev.map((item) =>
                                      item.id === task.id ? { ...item, due_date: selected } : item,
                                    ),
                                  )
                                  startTransition(async () => {
                                    const result = await updateTaskDueDateAllocation(task.id, selected)
                                    if (result.error) {
                                      setBoardTasks((prev) =>
                                        prev.map((item) =>
                                          item.id === task.id ? { ...item, due_date: null } : item,
                                        ),
                                      )
                                      toast.error(result.error)
                                      return
                                    }
                                    toast.success('Prazo definido')
                                  })
                                }}
                              >
                                Salvar
                              </Button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {isPending && (
          <p className="mt-3 text-xs text-muted-foreground">Salvando alocacao...</p>
        )}
      </CardContent>
    </Card>
  )
}
