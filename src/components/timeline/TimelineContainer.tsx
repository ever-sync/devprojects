'use client'

import { useState } from 'react'
import { TimelineView } from './TimelineView'
import { GanttView } from './GanttView'
import { Button } from '@/components/ui/button'
import { LayoutList, BarChart2 } from 'lucide-react'
import type { ProjectPhase } from '@/types'

interface TimelineContainerProps {
  phases: ProjectPhase[]
  projectId: string
  isAdmin: boolean
}

export function TimelineContainer({ phases, projectId, isAdmin }: TimelineContainerProps) {
  const [view, setView] = useState<'list' | 'gantt'>('list')

  return (
    <div>
      <div className="flex justify-end gap-1 mb-4">
        <Button
          variant={view === 'list' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setView('list')}
        >
          <LayoutList className="w-3.5 h-3.5 mr-1.5" />
          Lista
        </Button>
        <Button
          variant={view === 'gantt' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setView('gantt')}
        >
          <BarChart2 className="w-3.5 h-3.5 mr-1.5" />
          Gantt
        </Button>
      </div>

      {view === 'list' ? (
        <TimelineView phases={phases} projectId={projectId} isAdmin={isAdmin} />
      ) : (
        <GanttView phases={phases} />
      )}
    </div>
  )
}
