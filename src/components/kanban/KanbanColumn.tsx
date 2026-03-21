'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { KanbanCard } from './KanbanCard'
import { cn } from '@/lib/utils'
import type { Task, Profile } from '@/types'

interface KanbanColumnProps {
  id: string
  label: string
  tasks: (Task & { assignee?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null })[]
  isClientUser: boolean
  onCardClick?: (task: Task) => void
}

export function KanbanColumn({ id, label, tasks, isClientUser, onCardClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div className="flex flex-col min-w-[240px] max-w-[280px] w-full">
      <div className="flex items-center justify-between mb-3 px-1">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</h4>
        <span className="text-xs text-muted-foreground bg-secondary rounded-full px-2 py-0.5">
          {tasks.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 rounded-xl p-2 space-y-2 min-h-[200px] transition-colors',
          isOver ? 'bg-secondary' : 'bg-secondary/50'
        )}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              isClientUser={isClientUser}
              onClick={() => onCardClick?.(task)}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}
