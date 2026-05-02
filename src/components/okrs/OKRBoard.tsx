'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { createOKR, updateOKRStatus, upsertKeyResult, deleteKeyResult } from '@/actions/okrs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Target, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import type { OKR, KeyResult } from '@/actions/okrs'

const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-gray-500/10 text-gray-500',
  active: 'bg-blue-500/10 text-blue-600',
  completed: 'bg-green-500/10 text-green-600',
  cancelled: 'bg-red-500/10 text-red-500',
}
const STATUS_LABEL: Record<string, string> = { draft: 'Rascunho', active: 'Ativo', completed: 'Concluído', cancelled: 'Cancelado' }

function krProgress(kr: KeyResult) {
  if (kr.target === 0) return 0
  return Math.min(100, Math.round((kr.current / kr.target) * 100))
}

function okrProgress(okr: OKR) {
  if (!okr.key_results.length) return 0
  return Math.round(okr.key_results.reduce((sum, kr) => sum + krProgress(kr), 0) / okr.key_results.length)
}

function KeyResultRow({ kr, okrId }: { kr: KeyResult; okrId: string }) {
  const [isPending, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const [current, setCurrent] = useState(String(kr.current))
  const pct = krProgress(kr)

  function handleUpdate() {
    startTransition(async () => {
      const result = await upsertKeyResult({ id: kr.id, okrId, title: kr.title, target: kr.target, current: Number(current), unit: kr.unit })
      if (result.error) { toast.error(result.error); return }
      setEditing(false)
      toast.success('KR atualizado.')
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteKeyResult(kr.id)
      if (result.error) toast.error(result.error)
    })
  }

  return (
    <div className="flex items-center gap-3 py-2 group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm truncate">{kr.title}</span>
          <span className="text-xs text-muted-foreground ml-2 shrink-0">
            {editing ? (
              <span className="flex items-center gap-1">
                <Input
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  className="h-6 w-20 text-xs px-2"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleUpdate() }}
                />
                <span>/ {kr.target} {kr.unit}</span>
                <Button size="sm" className="h-6 text-xs px-2" onClick={handleUpdate} disabled={isPending}>✓</Button>
              </span>
            ) : (
              <button onClick={() => setEditing(true)} className="hover:text-foreground transition-colors">
                {kr.current} / {kr.target} {kr.unit}
              </button>
            )}
          </span>
        </div>
        <Progress value={pct} className="h-1.5" />
      </div>
      <span className="text-xs font-medium w-10 text-right shrink-0">{pct}%</span>
      <button onClick={handleDelete} disabled={isPending} className="opacity-0 group-hover:opacity-100 transition-opacity">
        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
      </button>
    </div>
  )
}

function AddKRForm({ okrId }: { okrId: string }) {
  const [isPending, startTransition] = useTransition()
  const [show, setShow] = useState(false)
  const [title, setTitle] = useState('')
  const [target, setTarget] = useState('100')
  const [unit, setUnit] = useState('%')

  function handleAdd() {
    if (!title.trim()) return
    startTransition(async () => {
      const result = await upsertKeyResult({ okrId, title, target: Number(target), current: 0, unit })
      if (result.error) { toast.error(result.error); return }
      setTitle(''); setTarget('100'); setUnit('%'); setShow(false)
      toast.success('KR adicionado.')
    })
  }

  if (!show) return (
    <button onClick={() => setShow(true)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1">
      <Plus className="h-3 w-3" /> Adicionar KR
    </button>
  )

  return (
    <div className="flex gap-2 mt-2 items-end">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título do KR" className="h-8 text-xs flex-1" />
      <Input value={target} onChange={(e) => setTarget(e.target.value)} className="h-8 text-xs w-20" placeholder="Meta" />
      <Input value={unit} onChange={(e) => setUnit(e.target.value)} className="h-8 text-xs w-16" placeholder="%" />
      <Button size="sm" className="h-8 text-xs" onClick={handleAdd} disabled={isPending}>Add</Button>
      <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShow(false)}>✕</Button>
    </div>
  )
}

function OKRCard({ okr }: { okr: OKR }) {
  const [isPending, startTransition] = useTransition()
  const [expanded, setExpanded] = useState(true)
  const progress = okrProgress(okr)

  function handleStatus(status: OKR['status']) {
    startTransition(async () => {
      const result = await updateOKRStatus(okr.id, status)
      if (result.error) toast.error(result.error)
    })
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <button onClick={() => setExpanded(!expanded)} className="mt-0.5 shrink-0">
            {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </button>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm">{okr.title}</h3>
            {okr.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{okr.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={okr.status}
            onChange={(e) => handleStatus(e.target.value as OKR['status'])}
            disabled={isPending}
            className={`text-xs rounded-full px-2.5 py-0.5 border-0 font-semibold cursor-pointer ${STATUS_COLOR[okr.status]}`}
          >
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {okr.owner && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Avatar className="h-5 w-5">
              <AvatarImage src={okr.owner.avatar_url ?? undefined} />
              <AvatarFallback className="text-[9px]">{okr.owner.full_name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            {okr.owner.full_name}
          </div>
        )}
        <span className="text-xs text-muted-foreground ml-auto">{okr.period}</span>
      </div>

      <div className="flex items-center gap-2">
        <Progress value={progress} className="flex-1 h-2" />
        <span className="text-xs font-semibold w-10 text-right">{progress}%</span>
      </div>

      {expanded && (
        <div className="space-y-0 pt-1 border-t border-border/40">
          {okr.key_results.map((kr) => <KeyResultRow key={kr.id} kr={kr} okrId={okr.id} />)}
          <AddKRForm okrId={okr.id} />
        </div>
      )}
    </div>
  )
}

interface OKRBoardProps {
  okrs: OKR[]
  periods: string[]
  members: Array<{ id: string; full_name: string }>
  currentPeriod: string
}

export function OKRBoard({ okrs, periods, members, currentPeriod }: OKRBoardProps) {
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [period, setPeriod] = useState(currentPeriod)
  const [ownerId, setOwnerId] = useState('')

  function handleCreate() {
    if (!title.trim()) { toast.error('Título obrigatório.'); return }
    startTransition(async () => {
      const result = await createOKR({ title, description, period, ownerId: ownerId || undefined })
      if (result.error) { toast.error(result.error); return }
      toast.success('OKR criado.')
      setOpen(false); setTitle(''); setDescription(''); setOwnerId('')
    })
  }

  const allPeriods = [...new Set([...periods, currentPeriod])].sort().reverse()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2 items-center">
          <Target className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{okrs.length} objetivo(s)</span>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />Novo OKR</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Objetivo</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Aumentar satisfação dos clientes" />
              </div>
              <div className="space-y-2">
                <Label>Descrição (opcional)</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Contexto e motivação..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Período</Label>
                  <Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2026-Q2" list="periods-list" />
                  <datalist id="periods-list">
                    {allPeriods.map((p) => <option key={p} value={p} />)}
                  </datalist>
                </div>
                <div className="space-y-2">
                  <Label>Responsável</Label>
                  <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">— Selecionar —</option>
                    {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                  </select>
                </div>
              </div>
              <Button onClick={handleCreate} disabled={isPending} className="w-full">
                {isPending ? 'Criando...' : 'Criar OKR'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {okrs.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-sm">
          Nenhum OKR para este período.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {okrs.map((okr) => <OKRCard key={okr.id} okr={okr} />)}
        </div>
      )}
    </div>
  )
}
