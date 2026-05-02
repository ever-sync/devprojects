'use client'

import type { ChangeEvent, ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { taskSchema, type TaskInput } from '@/lib/validations'
import { deleteTask, getTaskImageUrl, updateTask, uploadTaskImage } from '@/actions/tasks'
import { getActiveTaskTimer, startTaskTimer, stopTaskTimer } from '@/actions/time-entries'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TASK_PRIORITY_CONFIG, TASK_STATUS_LABELS } from '@/lib/constants'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { TaskComments } from './TaskComments'
import type { Task, Profile } from '@/types'
import {
  AlertTriangle, CalendarDays, CheckCircle2, CheckSquare2, Clock3, Flag,
  ImagePlus, Layers3, Link2, Plus, Trash2, User, X,
} from 'lucide-react'

type ChecklistItem = { id: string; text: string; done: boolean }
const TASK_CATEGORY_OPTIONS = [
  { value: 'saas', label: 'SaaS' },
  { value: 'automation', label: 'Automacao' },
  { value: 'other', label: 'Outras' },
] as const
const RECURRING_OPTIONS = [
  { value: 'none', label: 'Nao recorrente' },
  { value: 'daily', label: 'Diaria' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quinzenal' },
  { value: 'monthly', label: 'Mensal' },
] as const

interface TaskSheetProps {
  task: Task | null
  projectId: string
  currentUserId: string
  isAdmin: boolean
  teamMembers?: Pick<Profile, 'id' | 'full_name'>[]
  phases?: Array<{ id: string; name: string }>
  mentionableUsers?: Array<{ id: string; full_name: string; role: 'admin' | 'client' }>
  open: boolean
  onOpenChange: (open: boolean) => void
}

function parseChecklist(value: unknown): ChecklistItem[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => {
    if (!item || typeof item !== 'object') return null
    const current = item as Record<string, unknown>
    if (typeof current.id !== 'string' || typeof current.text !== 'string') return null
    return { id: current.id, text: current.text, done: Boolean(current.done) }
  }).filter((item): item is ChecklistItem => Boolean(item))
}

export function TaskSheet({
  task, projectId, currentUserId, isAdmin, teamMembers = [], phases = [], mentionableUsers = [], open, onOpenChange,
}: TaskSheetProps) {
  const initialChecklist = parseChecklist((task as (Task & { checklist?: unknown }) | null)?.checklist)
  const initialMentions = (task as (Task & { mentioned_user_ids?: string[] | null }) | null)?.mentioned_user_ids ?? []
  const initialCategory = ((task as (Task & { task_category?: string | null }) | null)?.task_category ?? 'other') as TaskInput['task_category']
  const [isLoading, setIsLoading] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [checklist, setChecklist] = useState<ChecklistItem[]>(initialChecklist)
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>(initialMentions)
  const [currentCategory, setCurrentCategory] = useState<TaskInput['task_category']>(initialCategory)
  const [currentPhaseId, setCurrentPhaseId] = useState(task?.phase_id ?? 'none')
  const [currentAssigneeId, setCurrentAssigneeId] = useState(task?.assignee_id ?? 'none')
  const [currentStatus, setCurrentStatus] = useState<TaskInput['status']>((task?.status ?? 'todo') as TaskInput['status'])
  const [currentPriority, setCurrentPriority] = useState<TaskInput['priority']>((task?.priority ?? 'medium') as TaskInput['priority'])
  const [currentRecurringPattern, setCurrentRecurringPattern] = useState<string>(
    ((task as (Task & { recurring_pattern?: string | null }) | null)?.recurring_pattern ?? 'none'),
  )
  const [isTimerLoading, setIsTimerLoading] = useState(false)
  const [activeTimerTaskId, setActiveTimerTaskId] = useState<string | null>(null)

  const { register, handleSubmit, setValue, reset } = useForm<TaskInput>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title ?? '',
      description: task?.description ?? undefined,
      status: (task?.status ?? 'todo') as TaskInput['status'],
      owner_type: (task?.owner_type ?? 'agency') as TaskInput['owner_type'],
      priority: (task?.priority ?? 'medium') as TaskInput['priority'],
      phase_id: task?.phase_id ?? undefined,
      assignee_id: task?.assignee_id ?? undefined,
      due_date: task?.due_date ?? undefined,
      remaining_hours: task?.remaining_hours ?? undefined,
      estimated_hours: task?.estimated_hours ?? undefined,
      actual_hours: task?.actual_hours ?? undefined,
      blocked_reason: task?.blocked_reason ?? undefined,
      detail_notes: (task as (Task & { detail_notes?: string | null }) | null)?.detail_notes ?? undefined,
      image_path: (task as (Task & { image_path?: string | null }) | null)?.image_path ?? undefined,
      task_category: initialCategory,
      recurring_pattern: ((task as (Task & { recurring_pattern?: string | null }) | null)?.recurring_pattern ?? null) as TaskInput['recurring_pattern'],
      recurring_interval_days: ((task as (Task & { recurring_interval_days?: number | null }) | null)?.recurring_interval_days ?? undefined) as TaskInput['recurring_interval_days'],
      mentioned_user_ids: initialMentions,
      checklist: initialChecklist,
    },
  })

  useEffect(() => {
    if (!task) return

    const imagePath = (task as Task & { image_path?: string | null }).image_path
    if (!imagePath) return

    getTaskImageUrl(task.id).then((result) => {
      if (!result.error) setImageUrl(result.url)
    })
  }, [task])

  useEffect(() => {
    if (!task || !open) return
    getActiveTaskTimer(projectId).then((result) => {
      if (result.error) return
      setActiveTimerTaskId(result.timer?.task_id ?? null)
    })
  }, [projectId, task, open])

  const statusLabel = task ? TASK_STATUS_LABELS[task.status] ?? task.status : ''
  const priorityLabel = task ? TASK_PRIORITY_CONFIG[task.priority]?.label ?? task.priority : ''
  const ownerLabel = task?.owner_type === 'client' ? 'Cliente' : 'Equipe interna'
  const dueDateLabel = task?.due_date ? new Date(`${task.due_date}T12:00:00`).toLocaleDateString('pt-BR') : 'Sem prazo definido'
  const mentionedUsers = useMemo(() => mentionableUsers.filter((u) => mentionedUserIds.includes(u.id)), [mentionableUsers, mentionedUserIds])

  if (!task) return null

  function syncChecklist(next: ChecklistItem[]) {
    setChecklist(next)
    setValue('checklist', next, { shouldDirty: true })
  }
  function handleAddChecklistItem() {
    const value = newChecklistItem.trim()
    if (!value) return
    syncChecklist([...checklist, { id: crypto.randomUUID(), text: value, done: false }])
    setNewChecklistItem('')
  }
  function toggleChecklistItem(id: string) { syncChecklist(checklist.map((item) => item.id === id ? { ...item, done: !item.done } : item)) }
  function updateChecklistText(id: string, text: string) { syncChecklist(checklist.map((item) => item.id === id ? { ...item, text } : item)) }
  function removeChecklistItem(id: string) { syncChecklist(checklist.filter((item) => item.id !== id)) }
  function toggleMention(userId: string) {
    const next = mentionedUserIds.includes(userId) ? mentionedUserIds.filter((id) => id !== userId) : [...mentionedUserIds, userId]
    setMentionedUserIds(next)
    setValue('mentioned_user_ids', next, { shouldDirty: true })
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    if (!task) return
    const file = event.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.set('image', file)
    setIsUploadingImage(true)
    const result = await uploadTaskImage(projectId, task.id, formData)
    setIsUploadingImage(false)
    if (result.error) return toast.error(result.error)
    setValue('image_path', result.imagePath, { shouldDirty: true })
    setImageUrl(result.imageUrl ?? null)
    toast.success('Imagem anexada com sucesso')
    event.target.value = ''
  }

  async function onSubmit(data: TaskInput) {
    if (!task) return
    setIsLoading(true)
    const result = await updateTask(task.id, { ...data, checklist, mentioned_user_ids: mentionedUserIds }, projectId)
    setIsLoading(false)
    if (result?.error) return toast.error(result.error)
    toast.success('Tarefa atualizada')
    onOpenChange(false)
  }

  async function handleDelete() {
    if (!task) return
    setIsLoading(true)
    const result = await deleteTask(task.id, projectId)
    setIsLoading(false)
    if (result?.error) return toast.error(result.error)
    toast.success('Tarefa removida')
    reset()
    onOpenChange(false)
  }

  const isCurrentTaskRunning = activeTimerTaskId === task.id

  async function handleStartTimer() {
    if (!task) return
    setIsTimerLoading(true)
    const result = await startTaskTimer(projectId, task.id, `Timer iniciado pela task "${task.title}"`)
    setIsTimerLoading(false)
    if (result?.error) return toast.error(result.error)
    setActiveTimerTaskId(task.id)
    toast.success(result.alreadyRunning ? 'Timer ja estava em execucao nesta task.' : 'Timer iniciado com sucesso.')
  }

  async function handleStopTimer() {
    if (!task) return
    setIsTimerLoading(true)
    const result = await stopTaskTimer(projectId, task.id)
    setIsTimerLoading(false)
    if (result?.error) return toast.error(result.error)
    setActiveTimerTaskId(null)
    toast.success(`Timer finalizado. ${result.hours}h registradas.`)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="dashboard-surface w-full sm:max-w-xl overflow-y-auto flex flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border/70 px-6 pb-5 pt-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/80">Detalhes da tarefa</p>
              <SheetTitle className="text-xl font-semibold leading-tight text-foreground">{task.title}</SheetTitle>
              <p className="max-w-lg text-sm leading-6 text-muted-foreground">Centralize briefing, checklist, anexo, fase e pessoas envolvidas sem sair do board.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <SummaryCard icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Status" value={statusLabel} tone="emerald" />
              <SummaryCard icon={<Flag className="h-3.5 w-3.5" />} label="Prioridade" value={priorityLabel} tone="sky" />
              <SummaryCard icon={<Layers3 className="h-3.5 w-3.5" />} label="Origem" value={ownerLabel} tone="violet" />
              <SummaryCard icon={<CalendarDays className="h-3.5 w-3.5" />} label="Prazo" value={dueDateLabel} tone="amber" />
            </div>
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <CardSection title="Conteudo principal" description="Descreva a tarefa e mantenha um campo livre para contexto complementar.">
              <Field label="Titulo"><Input {...register('title')} readOnly={!isAdmin} className="h-12 rounded-2xl border-border/70 bg-background px-4" /></Field>
              <Field label="Descricao principal"><Textarea rows={4} {...register('description')} readOnly={!isAdmin} className="min-h-[112px] rounded-2xl border-border/70 bg-background px-4 py-3" /></Field>
              <Field label="Campo aberto / notas"><Textarea rows={4} {...register('detail_notes')} readOnly={!isAdmin} placeholder="Use este espaco para briefing, contexto de negocio, observacoes ou referencia funcional." className="min-h-[120px] rounded-2xl border-border/70 bg-background px-4 py-3" /></Field>
            </CardSection>

            <CardSection title="Classificacao e timeline" description="Vincule a tarefa ao tipo de entrega e a fase correta do cronograma.">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <SelectField label="Status"><Select value={currentStatus} onValueChange={(v) => { setCurrentStatus(v as TaskInput['status']); setValue('status', v as TaskInput['status']) }} disabled={!isAdmin}><SelectTrigger className="h-12 rounded-2xl border-border/70 bg-background px-4"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(TASK_STATUS_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></SelectField>
                <SelectField label="Prioridade"><Select value={currentPriority} onValueChange={(v) => { setCurrentPriority(v as TaskInput['priority']); setValue('priority', v as TaskInput['priority']) }} disabled={!isAdmin}><SelectTrigger className="h-12 rounded-2xl border-border/70 bg-background px-4"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(TASK_PRIORITY_CONFIG).map(([v, c]) => <SelectItem key={v} value={v}>{c.label}</SelectItem>)}</SelectContent></Select></SelectField>
                <SelectField label="Categoria"><Select value={currentCategory} onValueChange={(v) => { setCurrentCategory(v as TaskInput['task_category']); setValue('task_category', v as TaskInput['task_category']) }} disabled={!isAdmin}><SelectTrigger className="h-12 rounded-2xl border-border/70 bg-background px-4"><SelectValue /></SelectTrigger><SelectContent>{TASK_CATEGORY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></SelectField>
                <SelectField label="Recorrencia">
                  <Select
                    value={currentRecurringPattern}
                    onValueChange={(v) => {
                      setCurrentRecurringPattern(v)
                      const pattern = v === 'none' ? null : (v as NonNullable<TaskInput['recurring_pattern']>)
                      setValue('recurring_pattern', pattern)
                      const interval = v === 'daily' ? 1 : v === 'weekly' ? 7 : v === 'biweekly' ? 14 : v === 'monthly' ? 30 : null
                      setValue('recurring_interval_days', interval)
                    }}
                    disabled={!isAdmin}
                  >
                    <SelectTrigger className="h-12 rounded-2xl border-border/70 bg-background px-4">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RECURRING_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </SelectField>
                <SelectField label="Fase da timeline"><Select value={currentPhaseId} onValueChange={(v) => { setCurrentPhaseId(v); setValue('phase_id', v === 'none' ? undefined : v) }} disabled={!isAdmin}><SelectTrigger className="h-12 rounded-2xl border-border/70 bg-background px-4"><SelectValue placeholder="Sem fase vinculada" /></SelectTrigger><SelectContent><SelectItem value="none">Sem fase vinculada</SelectItem>{phases.map((phase) => <SelectItem key={phase.id} value={phase.id}>{phase.name}</SelectItem>)}</SelectContent></Select></SelectField>
                <Field label="Data limite" className="sm:col-span-2"><Input type="date" {...register('due_date')} disabled={!isAdmin} className="h-12 rounded-2xl border-border/70 bg-background px-4" /></Field>
              </div>
            </CardSection>

            <CardSection title="Checklist de tarefas" description="Quebre a task em itens menores para acompanhar conclusao operacional.">
              <div className="flex gap-2">
                <Input value={newChecklistItem} onChange={(e) => setNewChecklistItem(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddChecklistItem() } }} disabled={!isAdmin} placeholder="Adicionar item ao checklist" className="h-11 rounded-2xl border-border/70 bg-background px-4" />
                <Button type="button" variant="outline" disabled={!isAdmin || !newChecklistItem.trim()} onClick={handleAddChecklistItem} className="h-11 rounded-2xl"><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-2">
                {checklist.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">Nenhum item criado ainda.</div>
                ) : checklist.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background px-3 py-3">
                    <button type="button" onClick={() => toggleChecklistItem(item.id)} disabled={!isAdmin} className="text-slate-500 transition-colors hover:text-slate-950 disabled:cursor-not-allowed">
                      <CheckSquare2 className={`h-5 w-5 ${item.done ? 'text-emerald-600' : 'text-slate-300'}`} />
                    </button>
                    <Input value={item.text} onChange={(e) => updateChecklistText(item.id, e.target.value)} readOnly={!isAdmin} className={`h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 ${item.done ? 'line-through text-muted-foreground' : ''}`} />
                    {isAdmin && <button type="button" onClick={() => removeChecklistItem(item.id)} className="text-slate-400 transition-colors hover:text-red-500"><X className="h-4 w-4" /></button>}
                  </div>
                ))}
              </div>
            </CardSection>

            <CardSection title="Colaboradores, horas e bloqueios" description="Defina ownership, mencoes e contexto de execucao da tarefa.">
              {isAdmin && (
                <div className="rounded-2xl border border-border/70 bg-background p-3">
                  <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" />
                    Timer operacional da tarefa
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      className="h-10 rounded-xl"
                      disabled={isTimerLoading || isCurrentTaskRunning || (activeTimerTaskId !== null && activeTimerTaskId !== task.id)}
                      onClick={handleStartTimer}
                    >
                      {isTimerLoading && !isCurrentTaskRunning ? 'Iniciando...' : 'Iniciar timer'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-xl"
                      disabled={isTimerLoading || !isCurrentTaskRunning}
                      onClick={handleStopTimer}
                    >
                      {isTimerLoading && isCurrentTaskRunning ? 'Finalizando...' : 'Parar timer'}
                    </Button>
                    {isCurrentTaskRunning && (
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                        Rodando nesta tarefa
                      </span>
                    )}
                    {activeTimerTaskId && activeTimerTaskId !== task.id && (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                        Voce ja possui timer ativo em outra tarefa
                      </span>
                    )}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="Estimado"><div className="relative"><Clock3 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input type="number" step="0.5" {...register('estimated_hours', { valueAsNumber: true })} className="h-12 rounded-2xl border-border/70 bg-background pl-11 pr-4" /></div></Field>
                <Field label="Executado"><div className="relative"><Clock3 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input type="number" step="0.5" {...register('actual_hours', { valueAsNumber: true })} className="h-12 rounded-2xl border-border/70 bg-background pl-11 pr-4" /></div></Field>
                <Field label="Restante"><div className="relative"><Clock3 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input type="number" step="0.5" {...register('remaining_hours', { valueAsNumber: true })} className="h-12 rounded-2xl border-border/70 bg-background pl-11 pr-4" /></div></Field>
              </div>
              {isAdmin && teamMembers.length > 0 && (
                <SelectField label="Responsavel">
                  <Select value={currentAssigneeId} onValueChange={(v) => { setCurrentAssigneeId(v); setValue('assignee_id', v === 'none' ? undefined : v) }}>
                    <SelectTrigger className="h-12 rounded-2xl border-border/70 bg-background px-4"><SelectValue placeholder="Sem responsavel" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none"><span className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-muted-foreground" />Sem responsavel</span></SelectItem>
                      {teamMembers.map((member) => <SelectItem key={member.id} value={member.id}>{member.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </SelectField>
              )}
              <Field label="Mencionar equipe ou cliente">
                <div className="flex flex-wrap gap-2">
                  {mentionableUsers.map((user) => {
                    const selected = mentionedUserIds.includes(user.id)
                    return (
                      <button key={user.id} type="button" disabled={!isAdmin} onClick={() => toggleMention(user.id)} className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${selected ? 'border-slate-900 bg-slate-900 text-white' : 'border-border bg-background text-slate-600 hover:border-slate-400'}`}>
                        @{user.full_name.split(' ')[0]}<span className="ml-1 opacity-70">{user.role === 'client' ? 'cliente' : 'time'}</span>
                      </button>
                    )
                  })}
                </div>
                {mentionedUsers.length > 0 && <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-600"><span className="font-semibold">Selecionados:</span> {mentionedUsers.map((u) => u.full_name).join(', ')}</div>}
              </Field>
              <Field label="Motivo do bloqueio">
                <div className="rounded-2xl border border-border/70 bg-background p-1">
                  <div className="mb-2 flex items-center gap-2 px-3 pt-2 text-xs text-muted-foreground"><AlertTriangle className="h-3.5 w-3.5 text-amber-500" />Use este campo apenas quando existir um impedimento real.</div>
                  <Textarea rows={4} {...register('blocked_reason')} placeholder="Descreva o que esta bloqueando esta tarefa" className="border-0 bg-transparent px-3 pb-3 pt-0 shadow-none focus-visible:ring-0" />
                </div>
              </Field>
            </CardSection>

            <CardSection title="Anexo visual" description="Anexe uma imagem para dar contexto visual ou referencia de tela.">
              {imageUrl ? (
                <div className="overflow-hidden rounded-[24px] border border-border/70 bg-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt="Anexo da tarefa" className="h-auto max-h-72 w-full object-cover" />
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  Nenhuma imagem anexada ainda.
                </div>
              )}
              {isAdmin && (
                <div className="flex flex-wrap items-center gap-3">
                  <Label htmlFor="task-image" className="inline-flex cursor-pointer items-center rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"><ImagePlus className="mr-2 h-4 w-4" />{isUploadingImage ? 'Enviando...' : 'Anexar imagem'}</Label>
                  <input id="task-image" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  {(task as Task & { image_path?: string | null }).image_path && <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600"><Link2 className="h-3.5 w-3.5" />imagem vinculada</div>}
                </div>
              )}
            </CardSection>

            <CardSection title="Comentarios" description="Centralize contexto, validacoes e alinhamentos da tarefa.">
              <TaskComments taskId={task.id} projectId={projectId} currentUserId={currentUserId} isAdmin={isAdmin} />
            </CardSection>

            {isAdmin && (
              <div className="sticky bottom-0 z-10 -mx-6 mt-2 border-t border-border/70 bg-background/95 px-6 py-4 backdrop-blur">
                <div className="flex gap-3">
                  <Button type="submit" disabled={isLoading} className="h-12 flex-1 rounded-2xl">{isLoading ? 'Salvando...' : 'Salvar alteracoes'}</Button>
                  <ConfirmDialog
                    title="Excluir tarefa"
                    description="Esta acao nao pode ser desfeita. A tarefa sera removida permanentemente."
                    confirmLabel="Excluir"
                    onConfirm={handleDelete}
                    trigger={<Button type="button" variant="outline" size="icon" disabled={isLoading} className="h-12 w-12 rounded-2xl border-red-500/20 text-red-500 hover:bg-red-500/10 hover:text-red-400"><Trash2 className="w-4 h-4" /></Button>}
                  />
                </div>
              </div>
            )}
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function SummaryCard({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: 'emerald' | 'sky' | 'violet' | 'amber' }) {
  const tones = {
    emerald: 'border-emerald-500/15 bg-emerald-500/5 text-emerald-700/80 dark:text-emerald-300/80',
    sky: 'border-sky-500/15 bg-sky-500/5 text-sky-700/80 dark:text-sky-300/80',
    violet: 'border-violet-500/15 bg-violet-500/5 text-violet-700/80 dark:text-violet-300/80',
    amber: 'border-amber-500/15 bg-amber-500/5 text-amber-700/80 dark:text-amber-300/80',
  }
  return <div className={`rounded-2xl border p-3 ${tones[tone]}`}><div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide">{icon}{label}</div><p className="text-sm font-semibold text-foreground">{value}</p></div>
}

function CardSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="space-y-4 rounded-[28px] border border-border/70 bg-background/70 p-5 shadow-sm"><div className="space-y-1"><h3 className="text-sm font-semibold text-foreground">{title}</h3><p className="text-xs leading-5 text-muted-foreground">{description}</p></div>{children}</section>
}

function Field({ label, className = '', children }: { label: string; className?: string; children: ReactNode }) {
  return <div className={`space-y-2 ${className}`}><Label className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</Label>{children}</div>
}

function SelectField({ label, children }: { label: string; children: ReactNode }) {
  return <Field label={label}>{children}</Field>
}
