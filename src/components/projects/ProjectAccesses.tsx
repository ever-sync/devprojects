'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Eye, EyeOff, Pencil, Trash2, Key, User, ExternalLink, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  createProjectAccess,
  updateProjectAccess,
  deleteProjectAccess,
  type ProjectAccessData,
  type ProjectAccessType,
} from '@/actions/project-accesses'

interface Access {
  id: string
  project_id: string
  type: ProjectAccessType
  name: string
  login: string | null
  password: string | null
  api_key: string | null
  url: string | null
  notes: string | null
  created_at: string
}

interface Props {
  accesses: Access[]
  projectId: string
  isAdmin: boolean
}

const EMPTY_FORM: ProjectAccessData = {
  type: 'credential',
  name: '',
  login: '',
  password: '',
  api_key: '',
  url: '',
  notes: '',
}

function SecretField({ value }: { value: string }) {
  const [visible, setVisible] = useState(false)

  function copyToClipboard() {
    navigator.clipboard.writeText(value)
    toast.success('Copiado para a area de transferencia')
  }

  return (
    <div className="flex items-center gap-1 font-mono text-sm">
      <span className="flex-1 truncate">{visible ? value : '••••••••••••'}</span>
      <button
        onClick={() => setVisible((v) => !v)}
        className="text-muted-foreground hover:text-foreground transition-colors"
        title={visible ? 'Ocultar' : 'Revelar'}
      >
        {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
      <button
        onClick={copyToClipboard}
        className="text-muted-foreground hover:text-foreground transition-colors"
        title="Copiar"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export function ProjectAccesses({ accesses: initial, projectId, isAdmin }: Props) {
  const [accesses, setAccesses] = useState<Access[]>(initial)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Access | null>(null)
  const [toDelete, setToDelete] = useState<Access | null>(null)
  const [form, setForm] = useState<ProjectAccessData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setOpen(true)
  }

  function openEdit(access: Access) {
    setEditing(access)
    setForm({
      type: access.type,
      name: access.name,
      login: access.login ?? '',
      password: access.password ?? '',
      api_key: access.api_key ?? '',
      url: access.url ?? '',
      notes: access.notes ?? '',
    })
    setOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return toast.error('Nome obrigatorio')
    if (form.type === 'credential' && !form.password?.trim()) return toast.error('Senha obrigatoria')
    if (form.type === 'api_key' && !form.api_key?.trim()) return toast.error('Chave obrigatoria')

    setSaving(true)
    const result = editing
      ? await updateProjectAccess(editing.id, projectId, form)
      : await createProjectAccess(projectId, form)
    setSaving(false)

    if (result.error) return toast.error(result.error)

    toast.success(editing ? 'Acesso atualizado' : 'Acesso cadastrado')
    setOpen(false)

    // Optimistic update
    if (editing) {
      setAccesses((prev) =>
        prev.map((a) =>
          a.id === editing.id
            ? { ...a, ...form, login: form.login || null, password: form.password || null, api_key: form.api_key || null, url: form.url || null, notes: form.notes || null }
            : a
        )
      )
    } else {
      // Refresh via server by forcing a small delay then reloading the list (simplest for new items)
      window.location.reload()
    }
  }

  async function handleDelete() {
    if (!toDelete) return
    setDeleting(true)
    const result = await deleteProjectAccess(toDelete.id, projectId)
    setDeleting(false)

    if (result.error) return toast.error(result.error)
    toast.success('Acesso removido')
    setAccesses((prev) => prev.filter((a) => a.id !== toDelete.id))
    setToDelete(null)
  }

  return (
    <div>
      {isAdmin && (
        <div className="mb-4 flex justify-end">
          <Button onClick={openCreate} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Novo Acesso
          </Button>
        </div>
      )}

      {accesses.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Key className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nenhum acesso cadastrado</p>
          {isAdmin && (
            <Button variant="outline" size="sm" className="mt-4" onClick={openCreate}>
              Cadastrar primeiro acesso
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {accesses.map((access) => (
            <Card key={access.id} className="relative group">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {access.type === 'api_key' ? (
                      <Key className="w-4 h-4 text-primary shrink-0" />
                    ) : (
                      <User className="w-4 h-4 text-primary shrink-0" />
                    )}
                    <span className="font-medium text-sm truncate">{access.name}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="secondary" className="text-xs">
                      {access.type === 'api_key' ? 'Chave' : 'Credencial'}
                    </Badge>
                    {isAdmin && (
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(access)}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => setToDelete(access)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 text-sm">
                  {access.type === 'credential' && access.login && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-14 shrink-0">Login</span>
                      <span className="truncate font-mono">{access.login}</span>
                    </div>
                  )}
                  {access.type === 'credential' && access.password && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-14 shrink-0">Senha</span>
                      <div className="flex-1 min-w-0">
                        <SecretField value={access.password} />
                      </div>
                    </div>
                  )}
                  {access.type === 'api_key' && access.api_key && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-14 shrink-0">Chave</span>
                      <div className="flex-1 min-w-0">
                        <SecretField value={access.api_key} />
                      </div>
                    </div>
                  )}
                  {access.url && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-14 shrink-0">URL</span>
                      <a
                        href={access.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-primary hover:underline flex items-center gap-1"
                      >
                        {access.url}
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                  )}
                  {access.notes && (
                    <div className="mt-2 text-muted-foreground text-xs leading-relaxed border-t pt-2">
                      {access.notes}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Acesso' : 'Novo Acesso'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as ProjectAccessType, login: '', password: '', api_key: '' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credential">Credencial (login + senha)</SelectItem>
                  <SelectItem value="api_key">Chave de API</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Nome / Servico *</Label>
              <Input
                placeholder="ex: Painel Admin, OpenAI, Cloudflare..."
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            {form.type === 'credential' && (
              <>
                <div className="space-y-1.5">
                  <Label>Login / Email</Label>
                  <Input
                    placeholder="usuario@exemplo.com"
                    value={form.login}
                    onChange={(e) => setForm({ ...form, login: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Senha *</Label>
                  <Input
                    type="text"
                    placeholder="Senha"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </div>
              </>
            )}

            {form.type === 'api_key' && (
              <div className="space-y-1.5">
                <Label>Chave *</Label>
                <Input
                  type="text"
                  placeholder="sk-..."
                  value={form.api_key}
                  onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>URL (opcional)</Label>
              <Input
                placeholder="https://..."
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Observacoes (opcional)</Label>
              <Textarea
                placeholder="Qualquer informacao adicional..."
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover acesso?</AlertDialogTitle>
            <AlertDialogDescription>
              O acesso <strong>{toDelete?.name}</strong> sera removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Removendo...' : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
