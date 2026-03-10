'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TASK_PRIORITY_CONFIG } from '@/lib/constants'
import type { Task, Profile } from '@/types'
import { format, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar, GripVertical, Clock } from 'lucide-react'
import { Avatar } from '@/components/shared/Avatar'
import { cn } from '@/lib/utils'

interface KanbanCardProps {
  task: Task & { assignee?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null }
  isClientUser: boolean
  isDragging?: boolean
  onClick?: () => void
}

export function KanbanCard({ task, isClientUser, isDragging, onClick }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: task.id,
    disabled: isClientUser,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const priorityConfig = TASK_PRIORITY_CONFIG[task.priority]

  const dueDays = task.due_date
    ? differenceInDays(new Date(task.due_date), new Date())
    : null
  const dueDateClass =
    dueDays === null
      ? 'text-muted-foreground'
      : dueDays < 0
      ? 'text-red-400'
      : dueDays <= 3
      ? 'text-orange-400'
      : 'text-muted-foreground'

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={cn(
        'bg-card rounded-lg border border-border p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow select-none',
        isSortableDragging && 'opacity-50',
        isDragging && 'shadow-xl rotate-1 opacity-80'
      )}
    >
      <div className="flex items-start gap-2">
        {!isClientUser && (
          <div
            {...attributes}
            {...listeners}
            className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground leading-tight mb-2 line-clamp-2">
            {task.title}
          </p>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-xs font-medium ${priorityConfig.color}`}>
              {priorityConfig.label}
            </span>

            {task.due_date && (
              <span className={`flex items-center gap-0.5 text-[10px] font-medium ${dueDateClass}`}>
                <Calendar className="w-2.5 h-2.5" />
                {format(new Date(task.due_date), 'd MMM', { locale: ptBR })}
                {dueDays !== null && dueDays < 0 && (
                  <span className="font-bold">!</span>
                )}
              </span>
            )}

            {(task.estimated_hours! > 0 || task.actual_hours! > 0) && (
              <span className="flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-md">
                <Clock className="w-2.5 h-2.5" />
                {task.actual_hours ?? 0}/{task.estimated_hours ?? 0}h
              </span>
            )}
          </div>
        </div>

        {task.assignee && (
          <Avatar
            name={task.assignee.full_name}
            avatarUrl={task.assignee.avatar_url}
            size="sm"
            className="shrink-0"
          />
        )}
      </div>
    </div>
  )
}
