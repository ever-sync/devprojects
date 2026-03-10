'use client'

import { useState, useTransition } from 'react'
import { CheckSquare2, Plus, X, User, Users } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { createTasksBulk } from '@/actions/tasks'

type Client = { id: string; name: string }
type Project = { id: string; name: string; client_id: string }
type Person = { id: string; full_name: string; avatar_url: string | null; type: 'team' | 'client' }

interface CreateTaskDialogProps {
  clients: Client[]
  projects: Project[]
  teamMembers: { id: string; full_name: string; avatar_url: string | null }[]
  clientUsers: { id: string; full_name: string; avatar_url: string | null; client_id: string }[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateTaskDialog({
  clients,
  projects,
  teamMembers,
  clientUsers,
  open,
  onOpenChange,
}: CreateTaskDialogProps) {
  const [isPending, startTransition] = useTransition()

  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [dueDate, setDueDate] = useState<string | undefined>(undefined)
  const [selectedAssignees, setSelectedAssignees] = useState<Person[]>([])

  const filteredProjects = selectedClientId
    ? projects.filter((p) => p.client_id === selectedClientId)
    : projects

  const clientPeople: Person[] = selectedClientId
    ? clientUsers
        .filter((u) => u.client_id === selectedClientId)
        .map((u) => ({ ...u, type: 'client' as const }))
    : []

  const teamPeople: Person[] = teamMembers.map((m) => ({ ...m, type: 'team' as const }))

  const allPeople: Person[] = [...teamPeople, ...clientPeople]

  function toggleAssignee(person: Person) {
    setSelectedAssignees((prev) => {
      const exists = prev.some((p) => p.id === person.id)
      if (exists) return prev.filter((p) => p.id !== person.id)
      return [...prev, person]
    })
  }

  function handleClientChange(clientId: string) {
    setSelectedClientId(clientId)
    setSelectedProjectId('')
    setSelectedAssignees([])
  }

  function resetForm() {
    setSelectedClientId('')
    setSelectedProjectId('')
    setTitle('')
    setDescription('')
    setPriority('medium')
    setDueDate(undefined)
    setSelectedAssignees([])
  }

  function handleSubmit() {
    if (!title.trim()) {
      toast.error('Informe o título da tarefa')
      return
    }
    if (!selectedProjectId) {
      toast.error('Selecione um projeto')
      return
    }

    startTransition(async () => {
      const result = await createTasksBulk({
        projectId: selectedProjectId,
        title: title.trim(),
        description: description.trim() || null,
        priority,
        dueDate: dueDate ?? null,
        assigneeIds: selectedAssignees.map((a) => a.id),
        hasClientAssignee: selectedAssignees.some((a) => a.type === 'client'),
      })

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(
          selectedAssignees.length > 1
            ? `${selectedAssignees.length} tarefas criadas com sucesso`
            : 'Tarefa criada com sucesso',
        )
        resetForm()
        onOpenChange(false)
      }
    })
  }

  const priorityOptions = [
    { value: 'low', label: 'Baixa' },
    { value: 'medium', label: 'Média' },
    { value: 'high', label: 'Alta' },
    { value: 'urgent', label: 'Urgente' },
  ]

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v) }}>
      <DialogContent className="dashboard-surface max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckSquare2 className="w-5 h-5 text-primary" />
            Nova Tarefa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Título <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Descreva a tarefa..."
              title="Título da tarefa"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 transition"
            />
          </div>

          {/* Client */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Cliente <span className="text-red-400">*</span>
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => handleClientChange(e.target.value)}
              title="Selecione um cliente"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 transition"
            >
              <option value="">Selecione um cliente</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Project */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Projeto <span className="text-red-400">*</span>
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              disabled={!selectedClientId}
              title="Selecione um projeto"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 transition disabled:opacity-50"
            >
              <option value="">
                {selectedClientId ? 'Selecione um projeto' : 'Primeiro selecione um cliente'}
              </option>
              {filteredProjects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Assignees */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Responsáveis
            </label>

            {selectedAssignees.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedAssignees.map((person) => (
                  <span
                    key={person.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                  >
                    {person.type === 'client'
                      ? <User className="w-3 h-3" />
                      : <Users className="w-3 h-3" />}
                    {person.full_name.split(' ')[0]}
                    <button
                      type="button"
                      title={`Remover ${person.full_name}`}
                      onClick={() => toggleAssignee(person)}
                      className="hover:text-red-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="rounded-lg border border-border bg-background overflow-hidden max-h-40 overflow-y-auto">
              {allPeople.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  {selectedClientId
                    ? 'Nenhum colaborador disponível'
                    : 'Selecione um cliente para ver os responsáveis'}
                </p>
              ) : (
                <>
                  {teamPeople.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 py-1.5 bg-muted/40">
                        Equipe Reobot
                      </p>
                      {teamPeople.map((person) => {
                        const selected = selectedAssignees.some((a) => a.id === person.id)
                        return (
                          <button
                            key={person.id}
                            type="button"
                            title={person.full_name}
                            onClick={() => toggleAssignee(person)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left ${selected ? 'bg-primary/8' : ''}`}
                          >
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
                              {person.avatar_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={person.avatar_url} alt={person.full_name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[10px] font-bold text-primary">
                                  {person.full_name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
                                </span>
                              )}
                            </div>
                            <span className="flex-1 truncate">{person.full_name}</span>
                            {selected && <Plus className="w-3.5 h-3.5 text-primary rotate-45 shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {clientPeople.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 py-1.5 bg-muted/40">
                        Cliente
                      </p>
                      {clientPeople.map((person) => {
                        const selected = selectedAssignees.some((a) => a.id === person.id)
                        return (
                          <button
                            key={person.id}
                            type="button"
                            title={person.full_name}
                            onClick={() => toggleAssignee(person)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left ${selected ? 'bg-primary/8' : ''}`}
                          >
                            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 overflow-hidden">
                              {person.avatar_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={person.avatar_url} alt={person.full_name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[10px] font-bold text-blue-500">
                                  {person.full_name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
                                </span>
                              )}
                            </div>
                            <span className="flex-1 truncate">{person.full_name}</span>
                            <span className="text-[10px] text-blue-400 shrink-0">cliente</span>
                            {selected && <Plus className="w-3.5 h-3.5 text-primary rotate-45 shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Priority + Due date row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Prioridade</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as typeof priority)}
                title="Selecione a prioridade"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 transition"
              >
                {priorityOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Data limite</label>
              <DatePicker
                value={dueDate}
                onChange={setDueDate}
                placeholder="Selecionar data"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes adicionais (opcional)..."
              title="Descrição da tarefa"
              rows={2}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 transition resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { resetForm(); onOpenChange(false) }}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isPending || !title.trim() || !selectedProjectId}
          >
            {isPending
              ? 'Criando...'
              : selectedAssignees.length > 1
                ? `Criar ${selectedAssignees.length} tarefas`
                : 'Criar Tarefa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
