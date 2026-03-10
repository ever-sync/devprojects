'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { taskSchema, type TaskInput } from '@/lib/validations'
import { updateTask, deleteTask } from '@/actions/tasks'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TASK_PRIORITY_CONFIG, TASK_STATUS_LABELS } from '@/lib/constants'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { TaskComments } from './TaskComments'
import type { Task, Profile } from '@/types'
import { Trash2, User, MessageSquare } from 'lucide-react'

interface TaskSheetProps {
  task: Task | null
  projectId: string
  currentUserId: string
  isAdmin: boolean
  teamMembers?: Pick<Profile, 'id' | 'full_name'>[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TaskSheet({ task, projectId, currentUserId, isAdmin, teamMembers = [], open, onOpenChange }: TaskSheetProps) {
  const [isLoading, setIsLoading] = useState(false)

  const { register, handleSubmit, setValue } = useForm<TaskInput>({
    resolver: zodResolver(taskSchema),
    values: task
      ? {
          title: task.title,
          description: task.description ?? undefined,
          status: task.status as TaskInput['status'],
          owner_type: task.owner_type as TaskInput['owner_type'],
          priority: task.priority as TaskInput['priority'],
          phase_id: task.phase_id ?? undefined,
          assignee_id: task.assignee_id ?? undefined,
          due_date: task.due_date ?? undefined,
          remaining_hours: task.remaining_hours ?? undefined,
          blocked_reason: task.blocked_reason ?? undefined,
        }
      : undefined,
  })

  async function onSubmit(data: TaskInput) {
    if (!task) return
    setIsLoading(true)
    await updateTask(task.id, data, projectId)
    setIsLoading(false)
    onOpenChange(false)
  }

  async function handleDelete() {
    if (!task) return
    setIsLoading(true)
    await deleteTask(task.id, projectId)
    setIsLoading(false)
    onOpenChange(false)
  }

  if (!task) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-5">
          <SheetTitle>Detalhes da Tarefa</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input id="title" {...register('title')} readOnly={!isAdmin} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" rows={4} {...register('description')} readOnly={!isAdmin} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                defaultValue={task.status}
                onValueChange={(v) => setValue('status', v as TaskInput['status'])}
                disabled={!isAdmin}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select
                defaultValue={task.priority}
                onValueChange={(v) => setValue('priority', v as TaskInput['priority'])}
                disabled={!isAdmin}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_PRIORITY_CONFIG).map(([value, config]) => (
                    <SelectItem key={value} value={value}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date">Data Limite</Label>
            <Input id="due_date" type="date" {...register('due_date')} disabled={!isAdmin} />
          </div>

          {isAdmin && (
            <div className="grid grid-cols-2 gap-3 pb-2">
              <div className="space-y-2">
                <Label className="text-xs">Est. (h)</Label>
                <Input
                  type="number"
                  step="0.5"
                  {...register('estimated_hours', { valueAsNumber: true })}
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Real. (h)</Label>
                <Input
                  type="number"
                  step="0.5"
                  {...register('actual_hours', { valueAsNumber: true })}
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Restante (h)</Label>
                <Input
                  type="number"
                  step="0.5"
                  {...register('remaining_hours', { valueAsNumber: true })}
                  className="h-9"
                />
              </div>
            </div>
          )}

          {isAdmin && (
            <div className="space-y-2">
              <Label htmlFor="blocked_reason">Motivo do bloqueio</Label>
              <Textarea
                id="blocked_reason"
                rows={3}
                {...register('blocked_reason')}
                placeholder="Descreva o que esta bloqueando esta tarefa"
              />
            </div>
          )}

          {isAdmin && teamMembers.length > 0 && (
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select
                defaultValue={task.assignee_id ?? 'none'}
                onValueChange={(v) => setValue('assignee_id', v === 'none' ? undefined : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sem responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      Sem responsável
                    </span>
                  </SelectItem>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isAdmin && (
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? 'Salvando...' : 'Salvar'}
              </Button>
              <ConfirmDialog
                title="Excluir tarefa"
                description="Esta ação não pode ser desfeita. A tarefa será removida permanentemente."
                confirmLabel="Excluir"
                onConfirm={handleDelete}
                trigger={
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={isLoading}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                }
              />
            </div>
          )}
        </form>

        {/* Comments section */}
        <div className="mt-6 pt-5 border-t border-border">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            Comentários
          </h3>
          <TaskComments
            taskId={task.id}
            projectId={projectId}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
