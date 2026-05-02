'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, ChevronDown, ChevronUp, Copy, ArrowUpCircle, Archive, Trash2, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  createAiScript,
  createScriptVersion,
  promoteAiScript,
  deleteAiScript,
  updateAiScript,
} from '@/actions/ai-scripts'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  staging: 'Staging',
  production: 'Produção',
  archived: 'Arquivado',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  staging: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  production: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  archived: 'bg-secondary text-secondary-foreground',
}

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  web: 'Web Chat',
  voice: 'Voz',
  email: 'Email',
}

type Script = {
  id: string
  name: string
  description: string | null
  channel: string
  content: string
  version: number
  status: string
  notes: string | null
  created_at: string
  promoted_at: string | null
  creator: { full_name: string; email: string } | null
  promoter: { full_name: string; email: string } | null
}

interface Props {
  projectId: string
  scripts: Script[]
}

export function AIScriptsPanel({ projectId, scripts: initialScripts }: Props) {
  const [scripts, setScripts] = useState(initialScripts)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showVersionDialog, setShowVersionDialog] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null)
  const [versionNotes, setVersionNotes] = useState('')
  const [isPending, startTransition] = useTransition()

  const [newScript, setNewScript] = useState({
    name: '',
    description: '',
    channel: 'whatsapp' as const,
    content: '',
    notes: '',
  })

  function handleCreate() {
    if (!newScript.name || !newScript.content) {
      toast.error('Nome e conteúdo são obrigatórios')
      return
    }
    startTransition(async () => {
      const result = await createAiScript({ projectId, ...newScript })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Script criado com sucesso')
        setScripts(prev => [result.data!, ...prev])
        setShowCreate(false)
        setNewScript({ name: '', description: '', channel: 'whatsapp', content: '', notes: '' })
      }
    })
  }

  function handleSaveEdit(id: string) {
    startTransition(async () => {
      const result = await updateAiScript({ id, projectId, content: editContent })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Script atualizado')
        setScripts(prev => prev.map(s => s.id === id ? { ...s, content: editContent } : s))
        setEditingId(null)
      }
    })
  }

  function handleNewVersion(parentId: string) {
    if (!versionNotes) {
      toast.error('Descreva o que mudou nessa versão')
      return
    }
    startTransition(async () => {
      const result = await createScriptVersion(parentId, versionNotes)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Nova versão criada como rascunho')
        setScripts(prev => [result.data!, ...prev])
        setShowVersionDialog(null)
        setVersionNotes('')
      }
    })
  }

  function handlePromote(id: string, target: 'staging' | 'production') {
    startTransition(async () => {
      const result = await promoteAiScript(id, target)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`Script promovido para ${STATUS_LABELS[target]}`)
        setScripts(prev => prev.map(s => {
          if (s.id === id) return { ...s, status: target }
          if (target === 'production' && s.status === 'production') return { ...s, status: 'archived' }
          return s
        }))
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteAiScript(id, projectId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Script removido')
        setScripts(prev => prev.filter(s => s.id !== id))
        setShowDeleteDialog(null)
      }
    })
  }

  const activeScript = scripts.find(s => s.status === 'production')

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Scripts de IA</h2>
          <p className="text-sm text-muted-foreground">
            Versione e gerencie os prompts/scripts do agente de atendimento
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Novo Script
        </Button>
      </div>

      {/* Script em produção */}
      {activeScript && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
          <div className="flex items-center gap-2 mb-1">
            <Bot className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700 dark:text-green-300">Em Produção</span>
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              {CHANNEL_LABELS[activeScript.channel]} · v{activeScript.version}
            </Badge>
          </div>
          <p className="font-medium">{activeScript.name}</p>
          {activeScript.promoted_at && (
            <p className="text-xs text-muted-foreground mt-1">
              Promovido em {format(new Date(activeScript.promoted_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
              {activeScript.promoter && ` por ${activeScript.promoter.full_name}`}
            </p>
          )}
        </div>
      )}

      {/* Lista de scripts */}
      {scripts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Bot className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Nenhum script criado ainda.</p>
          <p className="text-sm">Crie o primeiro script do agente de atendimento.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {scripts.map((script) => (
            <div
              key={script.id}
              className="rounded-lg border bg-card"
            >
              {/* Card header */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer"
                onClick={() => setExpandedId(expandedId === script.id ? null : script.id)}
              >
                <div className="flex items-center gap-3">
                  <Badge className={STATUS_COLORS[script.status]}>
                    {STATUS_LABELS[script.status]}
                  </Badge>
                  <span className="font-medium">{script.name}</span>
                  <span className="text-xs text-muted-foreground">v{script.version}</span>
                  <Badge variant="outline" className="text-xs">{CHANNEL_LABELS[script.channel]}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {format(new Date(script.created_at), 'dd/MM/yy', { locale: ptBR })}
                  </span>
                  {expandedId === script.id ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Expanded content */}
              {expandedId === script.id && (
                <div className="border-t px-4 pb-4 space-y-3">
                  {script.notes && (
                    <p className="text-sm text-muted-foreground pt-3 italic">"{script.notes}"</p>
                  )}

                  {editingId === script.id ? (
                    <div className="space-y-2 pt-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={12}
                        className="font-mono text-sm"
                        placeholder="Conteúdo do script/prompt..."
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSaveEdit(script.id)} disabled={isPending}>
                          Salvar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="relative rounded bg-muted p-3 cursor-pointer group"
                      onClick={() => { setEditingId(script.id); setEditContent(script.content) }}
                    >
                      <pre className="text-sm whitespace-pre-wrap font-mono max-h-60 overflow-y-auto">
                        {script.content}
                      </pre>
                      <span className="absolute top-2 right-2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        clique para editar
                      </span>
                    </div>
                  )}

                  {/* Ações */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {script.status === 'draft' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePromote(script.id, 'staging')}
                        disabled={isPending}
                      >
                        <ArrowUpCircle className="w-3 h-3 mr-1" />
                        Mover p/ Staging
                      </Button>
                    )}
                    {script.status === 'staging' && (
                      <Button
                        size="sm"
                        onClick={() => handlePromote(script.id, 'production')}
                        disabled={isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <ArrowUpCircle className="w-3 h-3 mr-1" />
                        Publicar em Produção
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setShowVersionDialog(script.id); setVersionNotes('') }}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Nova Versão
                    </Button>
                    {script.status !== 'production' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setShowDeleteDialog(script.id)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Excluir
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Dialog: criar script */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Script de IA</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Nome</Label>
                <Input
                  placeholder="Ex: Script Atendimento v1"
                  value={newScript.name}
                  onChange={(e) => setNewScript(p => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Canal</Label>
                <Select
                  value={newScript.channel}
                  onValueChange={(v) => setNewScript(p => ({ ...p, channel: v as typeof p.channel }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CHANNEL_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Descrição (opcional)</Label>
              <Input
                placeholder="Breve descrição do script"
                value={newScript.description}
                onChange={(e) => setNewScript(p => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Conteúdo do Script / Prompt</Label>
              <Textarea
                rows={10}
                className="font-mono text-sm"
                placeholder="Cole aqui o prompt completo do agente..."
                value={newScript.content}
                onChange={(e) => setNewScript(p => ({ ...p, content: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Notas da versão (opcional)</Label>
              <Input
                placeholder="O que tem nessa versão inicial?"
                value={newScript.notes}
                onChange={(e) => setNewScript(p => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={isPending}>Criar Script</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: nova versão */}
      <Dialog open={!!showVersionDialog} onOpenChange={() => setShowVersionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Versão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Uma cópia do script será criada como rascunho. Descreva o que mudará nessa versão.
          </p>
          <div className="space-y-1">
            <Label>O que mudou?</Label>
            <Textarea
              rows={3}
              placeholder="Ex: Ajuste no tom de voz, nova regra de escalada..."
              value={versionNotes}
              onChange={(e) => setVersionNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVersionDialog(null)}>Cancelar</Button>
            <Button
              onClick={() => showVersionDialog && handleNewVersion(showVersionDialog)}
              disabled={isPending}
            >
              Criar Versão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert: confirmar exclusão */}
      <AlertDialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir script?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O script será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => showDeleteDialog && handleDelete(showDeleteDialog)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
