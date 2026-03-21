'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Trash2, Globe, RefreshCw, CheckCircle, XCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  listGitIntegrations,
  createGitIntegration,
  deleteGitIntegration,
  updateGitIntegration,
} from '@/actions/git-integrations'

interface GitIntegration {
  id: string
  workspace_id: string
  provider: string
  name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface GitIntegrationsManagerProps {
  workspaceId: string
}

const PROVIDER_LABELS: Record<string, string> = {
  github: 'GitHub',
  gitlab: 'GitLab',
  bitbucket: 'Bitbucket',
}

export function GitIntegrationsManager({ workspaceId }: GitIntegrationsManagerProps) {
  const [integrations, setIntegrations] = useState<GitIntegration[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [formData, setFormData] = useState({
    provider: '' as string,
    name: '',
    oauthToken: '',
  })

  useEffect(() => {
    loadIntegrations()
  }, [workspaceId])

  async function loadIntegrations() {
    setLoading(true)
    const result = await listGitIntegrations(workspaceId)
    setIntegrations((result.integrations || []) as GitIntegration[])
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.provider || !formData.name || !formData.oauthToken) return

    setFormLoading(true)
    const result = await createGitIntegration({
      workspaceId,
      provider: formData.provider as 'github' | 'gitlab' | 'bitbucket',
      name: formData.name,
      oauthToken: formData.oauthToken,
    })

    if (result.success) {
      setIsAddOpen(false)
      setFormData({ provider: '', name: '', oauthToken: '' })
      loadIntegrations()
    } else {
      alert('Erro ao criar integracao: ' + result.error)
    }
    setFormLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja remover esta integracao? Repositorios vinculados serao desconectados.')) return

    const result = await deleteGitIntegration(id)
    if (result.success) {
      loadIntegrations()
    } else {
      alert('Erro ao remover: ' + result.error)
    }
  }

  async function handleToggleActive(integration: GitIntegration) {
    const result = await updateGitIntegration(integration.id, {
      isActive: !integration.is_active,
    })
    if (result.success) {
      loadIntegrations()
    } else {
      alert('Erro ao atualizar: ' + result.error)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {integrations.length} integracao(oes) configurada(s)
        </p>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Integracao
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Adicionar Integracao Git</DialogTitle>
                <DialogDescription>
                  Conecte um provedor Git para rastrear commits, branches e deployments nos seus projetos.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="provider">Provedor</Label>
                  <Select
                    value={formData.provider}
                    onValueChange={(v) => setFormData({ ...formData, provider: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o provedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="github">GitHub</SelectItem>
                      <SelectItem value="gitlab">GitLab</SelectItem>
                      <SelectItem value="bitbucket">Bitbucket</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="integrationName">Nome da integracao</Label>
                  <Input
                    id="integrationName"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: GitHub Pessoal, GitHub Empresa"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="token">Personal Access Token</Label>
                  <Input
                    id="token"
                    type="password"
                    value={formData.oauthToken}
                    onChange={(e) => setFormData({ ...formData, oauthToken: e.target.value })}
                    placeholder="ghp_xxxxxxxxxxxx"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.provider === 'github' && 'Gere em GitHub > Settings > Developer settings > Personal access tokens'}
                    {formData.provider === 'gitlab' && 'Gere em GitLab > Preferences > Access Tokens'}
                    {formData.provider === 'bitbucket' && 'Gere em Bitbucket > Personal settings > App passwords'}
                    {!formData.provider && 'Selecione um provedor para ver instrucoes'}
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={formLoading || !formData.provider}>
                  {formLoading ? 'Criando...' : 'Criar Integracao'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {integrations.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Globe className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Nenhuma integracao configurada</h3>
              <p className="mt-2 text-muted-foreground">
                Adicione uma integracao com GitHub, GitLab ou Bitbucket para comecar.
              </p>
              <Button className="mt-4" onClick={() => setIsAddOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Integracao
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {integrations.map((integration) => (
            <Card key={integration.id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Globe className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{integration.name}</p>
                        <Badge variant="outline" className="text-xs">
                          {PROVIDER_LABELS[integration.provider] || integration.provider}
                        </Badge>
                        {integration.is_active ? (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Ativa
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">
                            <XCircle className="h-3 w-3 mr-1" />
                            Inativa
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Criada {formatDistanceToNow(new Date(integration.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(integration)}
                    >
                      {integration.is_active ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => handleDelete(integration.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
