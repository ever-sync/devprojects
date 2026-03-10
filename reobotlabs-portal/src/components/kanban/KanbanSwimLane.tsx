'use client'

import { KANBAN_COLUMNS } from '@/lib/constants'
import { KanbanColumn } from './KanbanColumn'
import type { Task, Profile, TaskOwner } from '@/types'

interface KanbanSwimLaneProps {
  ownerType: TaskOwner
  label: string
  tasks: (Task & { assignee?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null })[]
  isClientUser: boolean
  onCardClick?: (task: Task) => void
}

export function KanbanSwimLane({
  ownerType,
  label,
  tasks,
  isClientUser,
  onCardClick,
}: KanbanSwimLaneProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${ownerType === 'agency' ? 'bg-primary' : 'bg-blue-500'}`} />
        <h3 className="text-sm font-semibold text-foreground">{label}</h3>
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">{tasks.length} tarefas</span>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-3">
        {KANBAN_COLUMNS.map((col) => (
          <KanbanColumn
            key={`${ownerType}-${col.id}`}
            id={`${ownerType}::${col.id}`}
            label={col.label}
            tasks={tasks.filter((t) => t.status === col.id)}
            isClientUser={isClientUser}
            onCardClick={onCardClick}
          />
        ))}
      </div>
    </div>
  )
}
