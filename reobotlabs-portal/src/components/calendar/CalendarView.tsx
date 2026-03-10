'use client'

import { useState } from 'react'
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  parseISO,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CalendarTask {
  id: string
  title: string
  status: string
  priority: string
  due_date: string | null
}

interface CalendarPhase {
  id: string
  name: string
  status: string
  estimated_start: string | null
  estimated_end: string | null
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const TASK_DOT: Record<string, string> = {
  todo: 'bg-muted-foreground/50',
  in_progress: 'bg-blue-400',
  review: 'bg-amber-400',
  done: 'bg-primary',
}

const PHASE_PILL: Record<string, string> = {
  pending: 'bg-muted/60 text-muted-foreground',
  in_progress: 'bg-blue-500/20 text-blue-300',
  completed: 'bg-primary/20 text-primary',
  blocked: 'bg-destructive/20 text-destructive',
}

export function CalendarView({
  tasks,
  phases,
}: {
  tasks: CalendarTask[]
  phases: CalendarPhase[]
}) {
  const [current, setCurrent] = useState(new Date())

  const monthStart = startOfMonth(current)
  const monthEnd = endOfMonth(current)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  function tasksForDay(day: Date) {
    return tasks.filter((t) => t.due_date && isSameDay(parseISO(t.due_date), day))
  }

  function phasesForDay(day: Date) {
    return phases.filter((p) => {
      const s = p.estimated_start ? parseISO(p.estimated_start) : null
      const e = p.estimated_end ? parseISO(p.estimated_end) : null
      if (!s || !e) return false
      try {
        return isWithinInterval(day, { start: s, end: e })
      } catch {
        return false
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground capitalize">
          {format(current, 'MMMM yyyy', { locale: ptBR })}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrent(subMonths(current, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs px-3"
            onClick={() => setCurrent(new Date())}
          >
            Hoje
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrent(addMonths(current, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 border-l border-t border-border rounded-lg overflow-hidden">
        {days.map((day) => {
          const dayTasks = tasksForDay(day)
          const dayPhases = phasesForDay(day)
          const inMonth = day.getMonth() === current.getMonth()
          const today = isToday(day)

          return (
            <div
              key={day.toString()}
              className={cn(
                'min-h-[100px] p-1.5 border-r border-b border-border bg-card',
                !inMonth && 'opacity-40 bg-background',
                today && 'ring-1 ring-inset ring-primary/30',
              )}
            >
              {/* Day number */}
              <div className="flex justify-end mb-1">
                <span
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
                    today
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground',
                  )}
                >
                  {format(day, 'd')}
                </span>
              </div>

              {/* Phase pills */}
              {dayPhases.slice(0, 1).map((phase) => (
                <div
                  key={phase.id}
                  title={phase.name}
                  className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded mb-0.5 truncate font-medium',
                    PHASE_PILL[phase.status] ?? 'bg-muted/40 text-muted-foreground',
                  )}
                >
                  {phase.name}
                </div>
              ))}
              {dayPhases.length > 1 && (
                <p className="text-[10px] text-muted-foreground px-1 mb-0.5">
                  +{dayPhases.length - 1} fase
                </p>
              )}

              {/* Task chips */}
              <div className="space-y-0.5">
                {dayTasks.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    title={task.title}
                    className="flex items-center gap-1 text-[10px] bg-secondary rounded px-1.5 py-0.5"
                  >
                    <span
                      className={cn(
                        'w-1.5 h-1.5 rounded-full flex-shrink-0',
                        TASK_DOT[task.status] ?? 'bg-muted-foreground',
                      )}
                    />
                    <span className="truncate text-foreground/80">{task.title}</span>
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <p className="text-[10px] text-muted-foreground px-1">
                    +{dayTasks.length - 3} tarefas
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 pt-2 border-t border-border text-xs text-muted-foreground">
        <span className="font-medium text-foreground/60">Tarefas:</span>
        {[
          { dot: 'bg-muted-foreground/50', label: 'A fazer' },
          { dot: 'bg-blue-400', label: 'Em andamento' },
          { dot: 'bg-amber-400', label: 'Revisão' },
          { dot: 'bg-primary', label: 'Concluído' },
        ].map(({ dot, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={cn('w-2 h-2 rounded-full', dot)} />
            {label}
          </div>
        ))}
        <span className="font-medium text-foreground/60 ml-2">Fases:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-2 rounded bg-blue-500/20" />
          Em andamento
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-2 rounded bg-primary/20" />
          Concluída
        </div>
      </div>
    </div>
  )
}
