'use client'

import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import { updateTask } from '@/actions/tasks'
import { KanbanSwimLane } from './KanbanSwimLane'
import { KanbanCard } from './KanbanCard'
import { TaskSheet } from './TaskSheet'
import { TASK_PRIORITY_CONFIG } from '@/lib/constants'
import type { Task, Profile } from '@/types'

interface KanbanBoardProps {
  projectId: string
  currentUserId: string
  initialTasks: (Task & { assignee?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null })[]
  isAdmin: boolean
  teamMembers?: Pick<Profile, 'id' | 'full_name'>[]
  phases?: Array<{ id: string; name: string }>
  mentionableUsers?: Array<{ id: string; full_name: string; role: 'admin' | 'client' }>
}

export function KanbanBoard({
  projectId,
  currentUserId,
  initialTasks,
  isAdmin,
  teamMembers = [],
  phases = [],
  mentionableUsers = [],
}: KanbanBoardProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const [activeTask, setActiveTask] = useState<(typeof initialTasks)[0] | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [priorityFilter, setPriorityFilter] = useState<string[]>([])

  function togglePriority(priority: string) {
    setPriorityFilter((prev) =>
      prev.includes(priority) ? prev.filter((p) => p !== priority) : [...prev, priority]
    )
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  )

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id)
    setActiveTask(task ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const taskId = active.id as string
    const overId = over.id as string

    // overId format: "ownerType::phaseId" (from KanbanColumn droppable id)
    const parts = overId.split('::')
    if (parts.length !== 2) return

    const nextPhaseId = parts[1] === 'unassigned' ? null : parts[1]

    const task = tasks.find((t) => t.id === taskId)
    if (!task || (task.phase_id ?? null) === nextPhaseId) return

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, phase_id: nextPhaseId } : t))
    )

    // Sync to DB
    updateTask(taskId, { phase_id: nextPhaseId }, projectId).then((result) => {
      if (result?.error) {
        // Revert on error
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, phase_id: task.phase_id } : t))
        )
      }
    })
  }

  function handleCardClick(task: Task) {
    setSelectedTask(task)
    setSheetOpen(true)
  }

  const filtered = priorityFilter.length > 0
    ? tasks.filter((t) => priorityFilter.includes(t.priority))
    : tasks
  const agencyTasks = filtered.filter((t) => t.owner_type === 'agency')
  const clientTasks = filtered.filter((t) => t.owner_type === 'client')

  return (
    <>
      {/* Priority filter bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-xs text-muted-foreground">Filtrar:</span>
        {Object.entries(TASK_PRIORITY_CONFIG).map(([key, cfg]) => {
          const active = priorityFilter.includes(key)
          return (
            <button
              key={key}
              type="button"
              onClick={() => togglePriority(key)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:border-foreground/40'
              }`}
            >
              {cfg.label}
            </button>
          )
        })}
        {priorityFilter.length > 0 && (
          <button
            type="button"
            onClick={() => setPriorityFilter([])}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Limpar
          </button>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <KanbanSwimLane
          ownerType="agency"
          label="Tarefas da Agência"
          tasks={agencyTasks}
          isClientUser={!isAdmin}
          phases={phases}
          onCardClick={handleCardClick}
        />

        <KanbanSwimLane
          ownerType="client"
          label="Aprovações do Cliente"
          tasks={clientTasks}
          isClientUser={!isAdmin}
          phases={phases}
          onCardClick={handleCardClick}
        />

        <DragOverlay>
          {activeTask && (
            <KanbanCard
              task={activeTask}
              isClientUser={!isAdmin}
              isDragging
            />
          )}
        </DragOverlay>
      </DndContext>

      <TaskSheet
        key={selectedTask?.id ?? 'task-sheet'}
        task={selectedTask}
        projectId={projectId}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        teamMembers={teamMembers}
        phases={phases}
        mentionableUsers={mentionableUsers}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  )
}
