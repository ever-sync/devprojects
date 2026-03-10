'use client'

import { useState, useTransition } from 'react'
import { Sparkles, ArrowLeft, CheckSquare, Square, ChevronDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { generateTasksFromText, createTasksFromAI, type AIGeneratedTask } from '@/actions/tasks'

interface AITaskButtonProps {
  projectId: string
}

type ReviewTask = AIGeneratedTask & {
  selected: boolean
  due_date: string | null
}

const SOURCE_TYPES = [
  { value: 'ata', label: 'Ata de Reunião' },
  { value: 'briefing', label: 'Briefing' },
  { value: 'mensagem', label: 'Mensagem' },
  { value: 'texto', label: 'Texto Livre' },
]

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
  medium: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  high: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  urgent: 'bg-red-500/15 text-red-400 border-red-500/20',
}

function estimatedDaysToDate(days: number | null): string | null {
  if (days === null) return null
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

export function AITaskButton({ projectId }: AITaskButtonProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'input' | 'review'>('input')
  const [isAnalyzing, startAnalyzing] = useTransition()
  const [isCreating, startCreating] = useTransition()

  const [sourceType, setSourceType] = useState('ata')
  const [text, setText] = useState('')
  const [reviewTasks, setReviewTasks] = useState<ReviewTask[]>([])
  const [openPriorityId, setOpenPriorityId] = useState<number | null>(null)

  function handleAnalyze() {
    if (!text.trim()) {
      toast.error('Cole um texto para analisar')
      return
    }

    startAnalyzing(async () => {
      const result = await generateTasksFromText(text.trim())
      if (result.error) {
        toast.error(result.error)
        return
      }
      if (!result.tasks || result.tasks.length === 0) {
        toast.warning('Nenhuma tarefa identificada. Tente um texto mais detalhado.')
        return
      }

      const tasks: ReviewTask[] = result.tasks.map((t) => ({
        ...t,
        selected: true,
        due_date: estimatedDaysToDate(t.estimated_days),
      }))
      setReviewTasks(tasks)
      setStep('review')
    })
  }

  function toggleTask(index: number) {
    setReviewTasks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, selected: !t.selected } : t))
    )
  }

  function updateTaskTitle(index: number, title: string) {
    setReviewTasks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, title } : t))
    )
  }

  function updateTaskPriority(index: number, priority: AIGeneratedTask['priority']) {
    setReviewTasks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, priority } : t))
    )
    setOpenPriorityId(null)
  }

  function handleCreate() {
    const selected = reviewTasks.filter((t) => t.selected)
    if (selected.length === 0) {
      toast.error('Selecione ao menos uma tarefa')
      return
    }

    startCreating(async () => {
      const result = await createTasksFromAI(
        projectId,
        selected.map((t) => ({
          title: t.title,
          description: t.description,
          priority: t.priority,
          due_date: t.due_date,
        }))
      )

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success(`${result.count} tarefa${result.count !== 1 ? 's criadas' : ' criada'} com sucesso`)
      handleClose()
    })
  }

  function handleClose() {
    setStep('input')
    setSourceType('ata')
    setText('')
    setReviewTasks([])
    setOpenPriorityId(null)
    setOpen(false)
  }

  const selectedCount = reviewTasks.filter((t) => t.selected).length

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="border-violet-500/30 bg-violet-500/5 text-violet-400 hover:bg-violet-500/10 hover:text-violet-300"
      >
        <Sparkles className="w-4 h-4 mr-1" />
        Importar com IA
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
        <DialogContent className="dashboard-surface max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-violet-500/15 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-violet-400" />
              </div>
              {step === 'input' ? 'IA · Importar Tarefas' : `${reviewTasks.length} tarefas encontradas`}
            </DialogTitle>
            {step === 'review' && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Revise e edite antes de criar
              </p>
            )}
          </DialogHeader>

          {/* INPUT STEP */}
          {step === 'input' && (
            <div className="flex flex-col gap-4 overflow-y-auto flex-1 pr-1">
              <p className="text-sm text-muted-foreground">
                Cole uma ata de reunião, briefing ou mensagem e a IA extrairá as tarefas automaticamente.
              </p>

              {/* Source type */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Tipo de texto</label>
                <div className="flex flex-wrap gap-2">
                  {SOURCE_TYPES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setSourceType(s.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        sourceType === s.value
                          ? 'bg-violet-500/15 border-violet-500/40 text-violet-400'
                          : 'border-border text-muted-foreground hover:border-violet-500/30 hover:text-violet-400'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text area */}
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Texto para analisar <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={
                    sourceType === 'ata'
                      ? 'Cole a ata da reunião aqui...\n\nEx: João ficou responsável por implementar o backend até sexta. Maria vai criar as telas no Figma esta semana. Precisamos configurar o ambiente de produção até o dia 20...'
                      : sourceType === 'briefing'
                      ? 'Cole o briefing do projeto aqui...'
                      : sourceType === 'mensagem'
                      ? 'Cole a mensagem ou email aqui...'
                      : 'Cole qualquer texto com tarefas ou ações a serem realizadas...'
                  }
                  rows={12}
                  autoFocus
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/60 transition resize-none font-mono leading-relaxed"
                />
                <p className="text-xs text-muted-foreground mt-1">{text.length} caracteres</p>
              </div>

              <div className="flex justify-end gap-2 shrink-0 pt-2 border-t border-border">
                <Button variant="outline" size="sm" onClick={handleClose} disabled={isAnalyzing}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !text.trim()}
                  className="bg-violet-600 hover:bg-violet-700 text-white border-0"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-1.5" />
                      Analisar com IA
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* REVIEW STEP */}
          {step === 'review' && (
            <div className="flex flex-col flex-1 overflow-hidden gap-3">
              <div className="flex items-center justify-between shrink-0">
                <span className="text-xs text-muted-foreground">
                  {selectedCount} de {reviewTasks.length} selecionadas
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setReviewTasks((prev) =>
                      prev.map((t) => ({ ...t, selected: selectedCount < reviewTasks.length }))
                    )
                  }
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  {selectedCount < reviewTasks.length ? 'Selecionar todas' : 'Desmarcar todas'}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {reviewTasks.map((task, index) => (
                  <div
                    key={index}
                    className={`rounded-lg border p-3 transition-colors ${
                      task.selected
                        ? 'border-violet-500/30 bg-violet-500/5'
                        : 'border-border bg-muted/20 opacity-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => toggleTask(index)}
                        className="mt-0.5 shrink-0 text-violet-400 hover:text-violet-300 transition-colors"
                        title={task.selected ? 'Desmarcar tarefa' : 'Marcar tarefa'}
                      >
                        {task.selected
                          ? <CheckSquare className="w-4 h-4" />
                          : <Square className="w-4 h-4 text-muted-foreground" />}
                      </button>

                      <div className="flex-1 min-w-0 space-y-2">
                        <input
                          type="text"
                          value={task.title}
                          onChange={(e) => updateTaskTitle(index, e.target.value)}
                          disabled={!task.selected}
                          className="w-full text-sm font-medium bg-transparent outline-none border-b border-transparent focus:border-border transition-colors disabled:cursor-not-allowed"
                          placeholder="Título da tarefa"
                        />

                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="relative">
                            <button
                              type="button"
                              disabled={!task.selected}
                              onClick={() => setOpenPriorityId(openPriorityId === index ? null : index)}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-colors disabled:cursor-not-allowed ${PRIORITY_COLORS[task.priority]}`}
                            >
                              {PRIORITY_LABELS[task.priority]}
                              <ChevronDown className="w-3 h-3" />
                            </button>
                            {openPriorityId === index && (
                              <div className="absolute z-50 top-full mt-1 left-0 rounded-lg border border-border bg-popover shadow-lg py-1 min-w-[100px]">
                                {(['low', 'medium', 'high', 'urgent'] as const).map((p) => (
                                  <button
                                    key={p}
                                    type="button"
                                    onClick={() => updateTaskPriority(index, p)}
                                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors ${task.priority === p ? 'font-semibold' : ''}`}
                                  >
                                    {PRIORITY_LABELS[p]}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {task.due_date && (
                            <span className="text-xs text-muted-foreground">
                              Prazo: {formatDate(task.due_date)}
                            </span>
                          )}

                          {task.description && (
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={task.description}>
                              {task.description.slice(0, 60)}{task.description.length > 60 ? '...' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between gap-2 shrink-0 pt-2 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep('input')}
                  disabled={isCreating}
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Voltar
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreate}
                  disabled={isCreating || selectedCount === 0}
                  className="bg-violet-600 hover:bg-violet-700 text-white border-0"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-1.5" />
                      Criar {selectedCount} tarefa{selectedCount !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
