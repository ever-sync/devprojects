'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { createOneOnOne, updateOneOnOne } from '@/actions/one-on-ones'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { CheckSquare, Square, Plus, MessageCircle, Calendar } from 'lucide-react'
import type { OneOnOne } from '@/actions/one-on-ones'

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Agendado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
}
const STATUS_COLOR: Record<string, string> = {
  scheduled: 'bg-blue-500/10 text-blue-600',
  completed: 'bg-green-500/10 text-green-600',
  cancelled: 'bg-gray-500/10 text-gray-500',
}

interface OneOnOnePanelProps {
  items: OneOnOne[]
  members: Array<{ id: string; full_name: string; avatar_url: string | null }>
  currentUserId: string
}

function OneOnOneCard({ item, currentUserId }: { item: OneOnOne; currentUserId: string }) {
  const [isPending, startTransition] = useTransition()
  const [notes, setNotes] = useState(item.notes ?? '')
  const [newAction, setNewAction] = useState('')
  const [actions, setActions] = useState(item.action_items ?? [])
  const [open, setOpen] = useState(false)
  const other = item.manager_id === currentUserId ? item.report : item.manager

  function handleAddAction() {
    if (!newAction.trim()) return
    setActions((prev) => [...prev, { id: crypto.randomUUID(), text: newAction.trim(), done: false }])
    setNewAction('')
  }

  function toggleAction(id: string) {
    setActions((prev) => prev.map((a) => a.id === id ? { ...a, done: !a.done } : a))
  }

  function handleSave(status?: 'completed') {
    startTransition(async () => {
      const result = await updateOneOnOne(item.id, { notes, actionItems: actions, status: status ?? item.status })
      if (result.error) { toast.error(result.error); return }
      toast.success('1:1 atualizado.')
      setOpen(false)
    })
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={other.avatar_url ?? undefined} />
            <AvatarFallback>{other.full_name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{other.full_name}</p>
            {item.scheduled_at && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(item.scheduled_at), "d MMM yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            )}
          </div>
        </div>
        <Badge className={`text-xs ${STATUS_COLOR[item.status]}`}>{STATUS_LABEL[item.status]}</Badge>
      </div>

      {actions.filter((a) => !a.done).length > 0 && (
        <p className="text-xs text-muted-foreground">
          {actions.filter((a) => !a.done).length} ação(ões) pendente(s)
        </p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-full gap-2">
            <MessageCircle className="h-4 w-4" />Abrir 1:1
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>1:1 com {other.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Notas da reunião</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Pautas, discussões, feedbacks..."
                className="min-h-[120px] text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>Action items</Label>
              <div className="space-y-2">
                {actions.map((a) => (
                  <div key={a.id} className="flex items-center gap-2">
                    <button onClick={() => toggleAction(a.id)} className="shrink-0">
                      {a.done
                        ? <CheckSquare className="h-4 w-4 text-green-500" />
                        : <Square className="h-4 w-4 text-muted-foreground" />
                      }
                    </button>
                    <span className={`text-sm flex-1 ${a.done ? 'line-through text-muted-foreground' : ''}`}>{a.text}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newAction}
                  onChange={(e) => setNewAction(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddAction() } }}
                  placeholder="Adicionar action item..."
                  className="text-sm"
                />
                <Button variant="outline" size="sm" onClick={handleAddAction}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => handleSave()} disabled={isPending} className="flex-1">
                {isPending ? 'Salvando...' : 'Salvar'}
              </Button>
              {item.status === 'scheduled' && (
                <Button variant="outline" onClick={() => handleSave('completed')} disabled={isPending}>
                  Concluir
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function OneOnOnePanel({ items, members, currentUserId }: OneOnOnePanelProps) {
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [reportId, setReportId] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')

  function handleCreate() {
    if (!reportId) { toast.error('Selecione um liderado.'); return }
    startTransition(async () => {
      const result = await createOneOnOne({ reportId, scheduledAt: scheduledAt || undefined })
      if (result.error) { toast.error(result.error); return }
      toast.success('1:1 criado.')
      setOpen(false)
      setReportId(''); setScheduledAt('')
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">1:1s</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />Agendar 1:1</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo 1:1</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Liderado</Label>
                <select
                  value={reportId}
                  onChange={(e) => setReportId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Selecionar...</option>
                  {members.filter((m) => m.id !== currentUserId).map((m) => (
                    <option key={m.id} value={m.id}>{m.full_name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Data e hora (opcional)</Label>
                <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
              </div>
              <Button onClick={handleCreate} disabled={isPending} className="w-full">
                {isPending ? 'Criando...' : 'Criar 1:1'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Nenhum 1:1 agendado.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => <OneOnOneCard key={item.id} item={item} currentUserId={currentUserId} />)}
        </div>
      )}
    </div>
  )
}
