'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, ChevronDown, ChevronUp, GitBranch, Copy, ArrowUpCircle, Trash2, CheckCircle2, XCircle, Clock, Zap } from 'lucide-react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  createN8nSnapshot,
  duplicateSnapshot,
  promoteN8nSnapshot,
  deleteN8nSnapshot,
} from '@/actions/n8n-workflows'
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

type Snapshot = {
  id: string
  name: string
  description: string | null
  n8n_workflow_id: string | null
  workflow_json: Record<string, unknown>
  version: number
  status: string
  environment: string
  notes: string | null
  node_count: number
  tags: string[]
  created_at: string
  promoted_at: string | null
  creator: { full_name: string; email: string } | null
  promoter: { full_name: string; email: string } | null
}

type ExecutionLog = {
  id: string
  n8n_execution_id: string | null
  status: string
  started_at: string | null
  finished_at: string | null
  duration_ms: number | null
  error_message: string | null
  created_at: string
}

interface Props {
  projectId: string
  snapshots: Snapshot[]
  executionLogs: ExecutionLog[]
}

export function N8NWorkflowsPanel({ projectId, snapshots: initialSnapshots, executionLogs }: Props) {
  const [snapshots, setSnapshots] = useState(initialSnapshots)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showVersionDialog, setShowVersionDialog] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null)
  const [showJsonViewer, setShowJsonViewer] = useState<string | null>(null)
  const [versionNotes, setVersionNotes] = useState('')
  const [isPending, startTransition] = useTransition()

  const [newSnapshot, setNewSnapshot] = useState({
    name: '',
    description: '',
    n8nWorkflowId: '',
    workflowJson: '{}',
    environment: 'development' as const,
    notes: '',
  })

  function handleCreate() {
    if (!newSnapshot.name) {
      toast.error('Nome é obrigatório')
      return
    }
    let parsedJson = {}
    try {
      parsedJson = JSON.parse(newSnapshot.workflowJson || '{}')
    } catch {
      toast.error('JSON do workflow inválido')
      return
    }
    startTransition(async () => {
      const result = await createN8nSnapshot({
        projectId,
        name: newSnapshot.name,
        description: newSnapshot.description || undefined,
        n8nWorkflowId: newSnapshot.n8nWorkflowId || undefined,
        workflowJson: parsedJson,
        environment: newSnapshot.environment,
        notes: newSnapshot.notes || undefined,
      })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Snapshot criado')
        setSnapshots(prev => [result.data!, ...prev])
        setShowCreate(false)
        setNewSnapshot({ name: '', description: '', n8nWorkflowId: '', workflowJson: '{}', environment: 'development', notes: '' })
      }
    })
  }

  function handleDuplicate(parentId: string) {
    if (!versionNotes) {
      toast.error('Descreva o que mudou nessa versão')
      return
    }
    startTransition(async () => {
      const result = await duplicateSnapshot(parentId, versionNotes)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Nova versão criada')
        setSnapshots(prev => [result.data!, ...prev])
        setShowVersionDialog(null)
        setVersionNotes('')
      }
    })
  }

  function handlePromote(id: string, target: 'staging' | 'production') {
    startTransition(async () => {
      const result = await promoteN8nSnapshot(id, target)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`Workflow promovido para ${STATUS_LABELS[target]}`)
        setSnapshots(prev => prev.map(s => {
          if (s.id === id) return { ...s, status: target, environment: target }
          if (target === 'production' && s.status === 'production') return { ...s, status: 'archived' }
          return s
        }))
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteN8nSnapshot(id, projectId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Snapshot removido')
        setSnapshots(prev => prev.filter(s => s.id !== id))
        setShowDeleteDialog(null)
      }
    })
  }

  const productionSnapshot = snapshots.find(s => s.status === 'production')

  function LogStatusIcon({ status }: { status: string }) {
    if (status === 'success') return <CheckCircle2 className="w-4 h-4 text-green-500" />
    if (status === 'error') return <XCircle className="w-4 h-4 text-red-500" />
    return <Clock className="w-4 h-4 text-yellow-500" />
  }

  return (
    <Tabs defaultValue="snapshots">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Workflows N8N</h2>
          <p className="text-sm text-muted-foreground">Versione os fluxos de automação e acompanhe execuções</p>
        </div>
        <div className="flex items-center gap-2">
          <TabsList>
            <TabsTrigger value="snapshots">Versões</TabsTrigger>
            <TabsTrigger value="logs">
              Execuções
              {executionLogs.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                  {executionLogs.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <Button onClick={() => setShowCreate(true)} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Novo Snapshot
          </Button>
        </div>
      </div>

      <TabsContent value="snapshots" className="space-y-4">
        {/* Produção ativa */}
        {productionSnapshot && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">Em Produção</span>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                v{productionSnapshot.version} · {productionSnapshot.node_count} nodes
              </Badge>
            </div>
            <p className="font-medium">{productionSnapshot.name}</p>
            {productionSnapshot.n8n_workflow_id && (
              <p className="text-xs text-muted-foreground mt-1">ID N8N: {productionSnapshot.n8n_workflow_id}</p>
            )}
          </div>
        )}

        {snapshots.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <GitBranch className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Nenhum snapshot criado ainda.</p>
            <p className="text-sm">Salve o JSON do seu workflow N8N para versionar.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {snapshots.map((snap) => (
              <div key={snap.id} className="rounded-lg border bg-card">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === snap.id ? null : snap.id)}
                >
                  <div className="flex items-center gap-3">
                    <Badge className={STATUS_COLORS[snap.status]}>{STATUS_LABELS[snap.status]}</Badge>
                    <span className="font-medium">{snap.name}</span>
                    <span className="text-xs text-muted-foreground">v{snap.version}</span>
                    <span className="text-xs text-muted-foreground hidden sm:inline">{snap.node_count} nodes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {format(new Date(snap.created_at), 'dd/MM/yy', { locale: ptBR })}
                    </span>
                    {expandedId === snap.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>

                {expandedId === snap.id && (
                  <div className="border-t px-4 pb-4 space-y-3">
                    {snap.notes && (
                      <p className="text-sm text-muted-foreground pt-3 italic">"{snap.notes}"</p>
                    )}
                    {snap.description && (
                      <p className="text-sm pt-2">{snap.description}</p>
                    )}
                    {snap.n8n_workflow_id && (
                      <p className="text-xs text-muted-foreground">ID N8N: <code className="bg-muted px-1 rounded">{snap.n8n_workflow_id}</code></p>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button size="sm" variant="outline" onClick={() => setShowJsonViewer(snap.id)}>
                        Ver JSON
                      </Button>
                      {snap.status === 'draft' && (
                        <Button size="sm" variant="outline" onClick={() => handlePromote(snap.id, 'staging')} disabled={isPending}>
                          <ArrowUpCircle className="w-3 h-3 mr-1" />
                          Mover p/ Staging
                        </Button>
                      )}
                      {snap.status === 'staging' && (
                        <Button size="sm" onClick={() => handlePromote(snap.id, 'production')} disabled={isPending} className="bg-green-600 hover:bg-green-700">
                          <ArrowUpCircle className="w-3 h-3 mr-1" />
                          Publicar em Produção
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => { setShowVersionDialog(snap.id); setVersionNotes('') }}>
                        <Copy className="w-3 h-3 mr-1" />
                        Nova Versão
                      </Button>
                      {snap.status !== 'production' && (
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setShowDeleteDialog(snap.id)}>
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
      </TabsContent>

      <TabsContent value="logs" className="space-y-2">
        {executionLogs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Nenhuma execução registrada.</p>
            <p className="text-sm">As execuções chegam via webhook do N8N.</p>
          </div>
        ) : (
          <div className="rounded-lg border divide-y">
            {executionLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <LogStatusIcon status={log.status} />
                  <div>
                    <p className="text-sm font-medium capitalize">{log.status}</p>
                    {log.n8n_execution_id && (
                      <p className="text-xs text-muted-foreground">ID: {log.n8n_execution_id}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  {log.duration_ms && (
                    <p className="text-xs text-muted-foreground">{(log.duration_ms / 1000).toFixed(2)}s</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(log.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      {/* JSON Viewer */}
      <Dialog open={!!showJsonViewer} onOpenChange={() => setShowJsonViewer(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>JSON do Workflow</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[60vh]">
            <pre className="text-xs bg-muted p-4 rounded font-mono">
              {showJsonViewer
                ? JSON.stringify(snapshots.find(s => s.id === showJsonViewer)?.workflow_json, null, 2)
                : ''}
            </pre>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                const snap = snapshots.find(s => s.id === showJsonViewer)
                if (snap) {
                  navigator.clipboard.writeText(JSON.stringify(snap.workflow_json, null, 2))
                  toast.success('JSON copiado!')
                }
              }}
            >
              Copiar JSON
            </Button>
            <Button onClick={() => setShowJsonViewer(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: criar snapshot */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Snapshot de Workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Nome do Workflow</Label>
                <Input
                  placeholder="Ex: Lead Qualification Flow"
                  value={newSnapshot.name}
                  onChange={(e) => setNewSnapshot(p => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Ambiente</Label>
                <Select
                  value={newSnapshot.environment}
                  onValueChange={(v) => setNewSnapshot(p => ({ ...p, environment: v as typeof p.environment }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="development">Development</SelectItem>
                    <SelectItem value="staging">Staging</SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>ID do Workflow no N8N (opcional)</Label>
              <Input
                placeholder="Ex: abc123"
                value={newSnapshot.n8nWorkflowId}
                onChange={(e) => setNewSnapshot(p => ({ ...p, n8nWorkflowId: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>JSON do Workflow (cole o export do N8N)</Label>
              <Textarea
                rows={8}
                className="font-mono text-xs"
                placeholder='{"nodes": [], "connections": {}, ...}'
                value={newSnapshot.workflowJson}
                onChange={(e) => setNewSnapshot(p => ({ ...p, workflowJson: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Notas da versão</Label>
              <Input
                placeholder="O que tem nessa versão?"
                value={newSnapshot.notes}
                onChange={(e) => setNewSnapshot(p => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={isPending}>Salvar Snapshot</Button>
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
            Uma cópia do snapshot será criada como rascunho. Você poderá editar o JSON e promovê-la.
          </p>
          <div className="space-y-1">
            <Label>O que mudará?</Label>
            <Textarea
              rows={3}
              placeholder="Ex: Adicionado node de envio de email, removido delay..."
              value={versionNotes}
              onChange={(e) => setVersionNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVersionDialog(null)}>Cancelar</Button>
            <Button onClick={() => showVersionDialog && handleDuplicate(showVersionDialog)} disabled={isPending}>
              Criar Versão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert: excluir */}
      <AlertDialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir snapshot?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
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
    </Tabs>
  )
}
