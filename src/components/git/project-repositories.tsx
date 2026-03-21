'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { GitBranch, Globe, Plus, Trash2, RefreshCw, ExternalLink } from 'lucide-react'
import {
  listProjectRepositories,
  removeRepositoryFromProject,
  addRepositoryToProject,
  listGitIntegrations,
} from '@/actions/git-integrations'

interface Repository {
  id: string
  project_id: string
  integration_id: string
  provider_repo_id: string
  repo_name: string
  repo_url: string
  default_branch: string
  is_primary: boolean
  auto_link_branches: boolean
  auto_link_prs: boolean
  auto_link_commits: boolean
  last_synced_at: string | null
  created_at: string
  git_integrations: {
    provider: string
    name: string
  } | null
}

interface Integration {
  id: string
  provider: string
  name: string
  is_active: boolean
}

interface ProjectRepositoriesProps {
  projectId: string
  workspaceId?: string
}

export function ProjectRepositories({ projectId, workspaceId }: ProjectRepositoriesProps) {
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [addLoading, setAddLoading] = useState(false)
  const [addForm, setAddForm] = useState({
    integrationId: '',
    repoName: '',
    repoUrl: '',
    defaultBranch: 'main',
    autoLink: true,
  })

  useEffect(() => {
    loadRepositories()
  }, [projectId])

  useEffect(() => {
    if (isAddDialogOpen && workspaceId && integrations.length === 0) {
      listGitIntegrations(workspaceId).then((result) => {
        const active = (result.integrations || []).filter((i: any) => i.is_active)
        setIntegrations(active as Integration[])
      })
    }
  }, [isAddDialogOpen, workspaceId])

  async function loadRepositories() {
    setLoading(true)
    const result = await listProjectRepositories(projectId)
    if (result.repositories) {
      setRepositories(result.repositories as Repository[])
    }
    setLoading(false)
  }

  async function handleAddRepository(e: React.FormEvent) {
    e.preventDefault()
    if (!addForm.integrationId || !addForm.repoName || !addForm.repoUrl) return

    setAddLoading(true)

    // Extract provider_repo_id from URL (owner/repo)
    const urlParts = addForm.repoUrl.replace(/\/$/, '').split('/')
    const providerRepoId = urlParts.slice(-2).join('/')

    const result = await addRepositoryToProject({
      projectId,
      integrationId: addForm.integrationId,
      providerRepoId,
      repoName: providerRepoId,
      repoUrl: addForm.repoUrl,
      defaultBranch: addForm.defaultBranch || 'main',
      isPrimary: repositories.length === 0,
      autoLinkBranches: addForm.autoLink,
      autoLinkPrs: addForm.autoLink,
      autoLinkCommits: addForm.autoLink,
    })

    if (result.success) {
      setIsAddDialogOpen(false)
      setAddForm({ integrationId: '', repoName: '', repoUrl: '', defaultBranch: 'main', autoLink: true })
      loadRepositories()
    } else {
      alert('Erro ao adicionar repositorio: ' + result.error)
    }
    setAddLoading(false)
  }

  async function handleRemoveRepository(repositoryId: string) {
    if (!confirm('Tem certeza que deseja remover este repositorio?')) return

    const result = await removeRepositoryFromProject(repositoryId, projectId)
    if (result.success) {
      loadRepositories()
    } else {
      alert(result.error)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center p-8"><RefreshCw className="h-6 w-6 animate-spin" /></div>
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Repositorios
            </CardTitle>
            <CardDescription>
              Repositorios Git vinculados a este projeto
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Repositorio</DialogTitle>
                <DialogDescription>
                  Vincule um repositorio Git a este projeto para rastrear commits, branches e deployments.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddRepository}>
                <div className="grid gap-4 py-4">
                  {!workspaceId ? (
                    <p className="text-sm text-muted-foreground">
                      Configuracao de workspace nao disponivel. Adicione repositorios pela pagina de integracoes.
                    </p>
                  ) : integrations.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      <p className="text-sm">Nenhuma integracao Git ativa.</p>
                      <p className="text-xs mt-1">Configure em Configuracoes &gt; Integracoes Git</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-2">
                        <Label htmlFor="integration">Integracao</Label>
                        <Select
                          value={addForm.integrationId}
                          onValueChange={(v) => setAddForm({ ...addForm, integrationId: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma integracao" />
                          </SelectTrigger>
                          <SelectContent>
                            {integrations.map((integration) => (
                              <SelectItem key={integration.id} value={integration.id}>
                                {integration.name} ({integration.provider})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="repoUrl">URL do Repositorio</Label>
                        <Input
                          id="repoUrl"
                          value={addForm.repoUrl}
                          onChange={(e) => setAddForm({ ...addForm, repoUrl: e.target.value })}
                          placeholder="https://github.com/owner/repo"
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="defaultBranch">Branch Principal</Label>
                        <Input
                          id="defaultBranch"
                          value={addForm.defaultBranch}
                          onChange={(e) => setAddForm({ ...addForm, defaultBranch: e.target.value })}
                          placeholder="main"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="autoLink"
                          aria-label="Vincular branches e PRs automaticamente"
                          checked={addForm.autoLink}
                          onChange={(e) => setAddForm({ ...addForm, autoLink: e.target.checked })}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor="autoLink" className="text-sm">
                          Vincular branches e PRs automaticamente
                        </Label>
                      </div>
                    </>
                  )}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancelar
                  </Button>
                  {integrations.length > 0 && workspaceId && (
                    <Button type="submit" disabled={addLoading || !addForm.integrationId || !addForm.repoUrl}>
                      {addLoading ? 'Adicionando...' : 'Adicionar'}
                    </Button>
                  )}
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {repositories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum repositorio vinculado</p>
            <p className="text-sm">Adicione um repositorio para comecar a rastrear atividade Git</p>
          </div>
        ) : (
          <div className="space-y-4">
            {repositories.map((repo) => (
              <div
                key={repo.id}
                className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-muted rounded">
                    <Globe className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{repo.repo_name}</span>
                      {repo.is_primary && (
                        <Badge variant="secondary" className="text-xs">Principal</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <span>{repo.git_integrations?.provider}</span>
                      <span>-</span>
                      <span className="font-mono text-xs">{repo.default_branch}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={repo.auto_link_branches}
                          readOnly
                          aria-label="Auto-link branches"
                          className="rounded border-gray-300"
                        />
                        Branches
                      </label>
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={repo.auto_link_prs}
                          readOnly
                          aria-label="Auto-link PRs"
                          className="rounded border-gray-300"
                        />
                        PRs
                      </label>
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={repo.auto_link_commits}
                          readOnly
                          aria-label="Auto-link commits"
                          className="rounded border-gray-300"
                        />
                        Commits
                      </label>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" asChild>
                    <a href={repo.repo_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveRepository(repo.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
