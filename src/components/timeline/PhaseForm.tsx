'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { phaseSchema, type PhaseInput } from '@/lib/validations'
import { createClient } from '@/lib/supabase/client'
import type { ProjectPhase } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DatePicker } from '@/components/ui/date-picker'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface PhaseFormProps {
  projectId: string
  phase?: ProjectPhase
  orderIndex?: number
}

export function PhaseForm({ projectId, phase, orderIndex = 0 }: PhaseFormProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const form = useForm<PhaseInput>({
    resolver: zodResolver(phaseSchema),
    defaultValues: phase
      ? {
          name: phase.name,
          description: phase.description ?? undefined,
          status: phase.status as PhaseInput['status'],
          estimated_start: phase.estimated_start ?? undefined,
          estimated_end: phase.estimated_end ?? undefined,
          actual_start: phase.actual_start ?? undefined,
          actual_end: phase.actual_end ?? undefined,
        }
      : { status: 'pending' as PhaseInput['status'] },
  })

  const { control, register, handleSubmit, setValue, reset } = form
  const estimatedStart = useWatch({ control, name: 'estimated_start' })
  const estimatedEnd = useWatch({ control, name: 'estimated_end' })
  const actualStart = useWatch({ control, name: 'actual_start' })
  const actualEnd = useWatch({ control, name: 'actual_end' })

  async function onSubmit(data: PhaseInput) {
    setIsLoading(true)
    const supabase = createClient()

    if (phase) {
      await supabase
        .from('project_phases')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', phase.id)
    } else {
      await supabase.from('project_phases').insert({
        ...data,
        project_id: projectId,
        order_index: orderIndex,
      })
    }

    setIsLoading(false)
    setOpen(false)
    reset()
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {phase ? (
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
            Editar
          </Button>
        ) : (
          <Button size="sm" variant="outline">
            <Plus className="mr-1 h-4 w-4" />
            Nova fase
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{phase ? 'Editar fase' : 'Nova fase'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-2 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input id="name" {...register('name')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descricao</Label>
            <Textarea id="description" rows={2} {...register('description')} />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              defaultValue={phase?.status ?? 'pending'}
              onValueChange={(value) => setValue('status', value as PhaseInput['status'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="in_progress">Em andamento</SelectItem>
                <SelectItem value="completed">Concluido</SelectItem>
                <SelectItem value="blocked">Bloqueado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Inicio estimado</Label>
              <DatePicker
                value={estimatedStart ?? undefined}
                onChange={(value) => setValue('estimated_start', value)}
                placeholder="Selecionar"
              />
            </div>
            <div className="space-y-2">
              <Label>Fim estimado</Label>
              <DatePicker
                value={estimatedEnd ?? undefined}
                onChange={(value) => setValue('estimated_end', value)}
                placeholder="Selecionar"
              />
            </div>
            <div className="space-y-2">
              <Label>Inicio real</Label>
              <DatePicker
                value={actualStart ?? undefined}
                onChange={(value) => setValue('actual_start', value)}
                placeholder="Selecionar"
              />
            </div>
            <div className="space-y-2">
              <Label>Fim real</Label>
              <DatePicker
                value={actualEnd ?? undefined}
                onChange={(value) => setValue('actual_end', value)}
                placeholder="Selecionar"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? 'Salvando...' : phase ? 'Salvar' : 'Criar fase'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
