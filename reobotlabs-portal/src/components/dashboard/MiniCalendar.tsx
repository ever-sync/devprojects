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
  parseISO,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MiniCalendarProps {
  taskDueDates: string[] // ISO date strings
}

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

export function MiniCalendar({ taskDueDates }: MiniCalendarProps) {
  const [current, setCurrent] = useState(new Date())

  const monthStart = startOfMonth(current)
  const monthEnd = endOfMonth(current)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const dueDates = taskDueDates.map((d) => parseISO(d))

  function hasTasks(day: Date) {
    return dueDates.some((d) => isSameDay(d, day))
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-foreground capitalize">
          {format(current, 'MMMM yyyy', { locale: ptBR })}
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setCurrent(subMonths(current, 1))}
            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setCurrent(addMonths(current, 1))}
            className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-medium text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((day) => {
          const inMonth = day.getMonth() === current.getMonth()
          const today = isToday(day)
          const hasDue = hasTasks(day)

          return (
            <div key={day.toString()} className="flex flex-col items-center py-0.5">
              <span
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium transition-colors',
                  !inMonth && 'opacity-30 text-muted-foreground',
                  inMonth && !today && 'text-muted-foreground hover:bg-sidebar-accent',
                  today && 'bg-primary text-primary-foreground font-bold',
                )}
              >
                {format(day, 'd')}
              </span>
              {hasDue && inMonth && (
                <span className={cn(
                  'w-1 h-1 rounded-full mt-0.5',
                  today ? 'bg-primary-foreground' : 'bg-primary',
                )} />
              )}
            </div>
          )
        })}
      </div>

      {/* Today button */}
      <button
        type="button"
        onClick={() => setCurrent(new Date())}
        className="w-full mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
      >
        Hoje
      </button>
    </div>
  )
}
