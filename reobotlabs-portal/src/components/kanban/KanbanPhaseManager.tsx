'use client'

import { Layers3 } from 'lucide-react'
import type { ProjectPhase } from '@/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { PhaseForm } from '@/components/timeline/PhaseForm'

interface KanbanPhaseManagerProps {
  projectId: string
  phases: ProjectPhase[]
}

export function KanbanPhaseManager({ projectId, phases }: KanbanPhaseManagerProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Layers3 className="mr-2 h-4 w-4" />
          Editar etapas
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Etapas do Kanban</DialogTitle>
          <DialogDescription>
            Renomeie as etapas existentes ou crie novas colunas para organizar o board por fase do projeto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {phases.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
              Nenhuma etapa criada ainda. Adicione a primeira coluna do Kanban.
            </div>
          ) : (
            phases.map((phase) => (
              <div key={phase.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{phase.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Ordem {phase.order_index + 1}
                    {phase.description ? ` · ${phase.description}` : ''}
                  </p>
                </div>
                <PhaseForm projectId={projectId} phase={phase} />
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end">
          <PhaseForm projectId={projectId} orderIndex={phases.length} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
