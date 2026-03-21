'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { approveTimeEntry, createTimeEntry } from '@/actions/time-entries'

interface TimeEntryRecord {
  id: string
  entry_date: string
  hours: number
  notes: string | null
  approved_at: string | null
  task: { id: string; title: string } | null
  user: { id: string; full_name: string } | null
}

interface TimeEntriesPanelProps {
  projectId: string
  entries: TimeEntryRecord[]
  tasks: Array<{ id: string; title: string }>
  isAdmin: boolean
}

export function TimeEntriesPanel({ projectId, entries, tasks, isAdmin }: TimeEntriesPanelProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    task_id: '',
    entry_date: new Date().toISOString().slice(0, 10),
    hours: '',
    notes: '',
  })

  const totals = useMemo(() => {
    return entries.reduce((acc, entry) => {
      acc.total += Number(entry.hours)
      if (entry.approved_at) acc.approved += Number(entry.hours)
      return acc
    }, { total: 0, approved: 0 })
  }, [entries])

  function complete(message: string) {
    toast.success(message)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Horas lancadas</CardDescription>
            <CardTitle>{totals.total.toFixed(1)}h</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Horas aprovadas</CardDescription>
            <CardTitle>{totals.approved.toFixed(1)}h</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Entradas</CardDescription>
            <CardTitle>{entries.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lancar horas</CardTitle>
          <CardDescription>
            Registre esforco real por tarefa para alimentar produtividade e margem.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select
            value={form.task_id || 'none'}
            onValueChange={(value) => setForm((prev) => ({ ...prev, task_id: value === 'none' ? '' : value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecionar tarefa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem tarefa vinculada</SelectItem>
              {tasks.map((task) => (
                <SelectItem key={task.id} value={task.id}>
                  {task.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              type="date"
              value={form.entry_date}
              onChange={(e) => setForm((prev) => ({ ...prev, entry_date: e.target.value }))}
              disabled={isPending}
            />
            <Input
              type="number"
              step="0.25"
              min="0.25"
              max="24"
              placeholder="Horas"
              value={form.hours}
              onChange={(e) => setForm((prev) => ({ ...prev, hours: e.target.value }))}
              disabled={isPending}
            />
          </div>
          <Textarea
            placeholder="Notas do apontamento"
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            disabled={isPending}
          />
          <div className="flex justify-end">
            <Button
              disabled={isPending}
              onClick={() => startTransition(async () => {
                const result = await createTimeEntry(projectId, {
                  task_id: form.task_id || null,
                  entry_date: form.entry_date,
                  hours: Number(form.hours),
                  notes: form.notes || null,
                })
                if (result.error) {
                  toast.error(result.error)
                  return
                }
                setForm({
                  task_id: '',
                  entry_date: new Date().toISOString().slice(0, 10),
                  hours: '',
                  notes: '',
                })
                complete('Horas registradas')
              })}
            >
              Registrar horas
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historico de apontamentos</CardTitle>
          <CardDescription>
            Base operacional para comparar horas planejadas vs realizadas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {entries.map((entry) => (
            <div key={entry.id} className="rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">
                    {entry.task?.title ?? 'Entrada sem tarefa'} • {entry.hours}h
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {entry.user?.full_name ?? 'Usuario'} em {entry.entry_date}
                  </p>
                  {entry.notes && (
                    <p className="mt-2 text-sm text-muted-foreground">{entry.notes}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {entry.approved_at ? 'Aprovado' : 'Pendente'}
                  </p>
                  {isAdmin && !entry.approved_at && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      disabled={isPending}
                      onClick={() => startTransition(async () => {
                        const result = await approveTimeEntry(projectId, entry.id)
                        if (result.error) {
                          toast.error(result.error)
                          return
                        }
                        complete('Horas aprovadas')
                      })}
                    >
                      Aprovar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {entries.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma hora lancada ainda.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
