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
import { GitBranch, GitCommit, GitMerge, Globe, Link, Plus, Trash2, RefreshCw, ExternalLink } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { listProjectRepositories, removeRepositoryFromProject, type listCommits, type listDeployments } from '@/actions/git-integrations'

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

interface ProjectRepositoriesProps {
  projectId: string
}

export function ProjectRepositories({ projectId }: ProjectRepositoriesProps) {
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  useEffect(() => {
    loadRepositories()
  }, [projectId])

  async function loadRepositories() {
    setLoading(true)
    const result = await listProjectRepositories(projectId)
    if (result.repositories) {
      setRepositories(result.repositories as Repository[])
    }
    setLoading(false)
  }

  async function handleRemoveRepository(repositoryId: string) {
    if (!confirm('Tem certeza que deseja remover este repositório?')) return
    
    const result = await removeRepositoryFromProject(repositoryId, projectId)
    if (result.success) {
      loadRepositories()
    } else {
      alert(result.error)
    }
  }

  function getProviderIcon(provider: string) {
    switch (provider) {
      case 'github':
        return <Globe className="h-4 w-4" />
      case 'gitlab':
        return <Globe className="h-4 w-4" />
      case 'bitbucket':
        return <Globe className="h-4 w-4" />
      default:
        return <Globe className="h-4 w-4" />
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
              Repositórios
            </CardTitle>
            <CardDescription>
              Repositórios Git vinculados a este projeto
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
                <DialogTitle>Adicionar Repositório</DialogTitle>
                <DialogDescription>
                  Vincule um repositório Git a este projeto para rastrear commits, branches e deployments.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault()
                // TODO: Implementar adição de repositório
                setIsAddDialogOpen(false)
              }}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="integration">Integração</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma integração" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="github">GitHub</SelectItem>
                        <SelectItem value="gitlab">GitLab</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="repoUrl">URL do Repositório</Label>
                    <Input 
                      id="repoUrl" 
                      placeholder="https://github.com/owner/repo" 
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="autoLink" 
                      defaultChecked 
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="autoLink" className="text-sm">
                      Vincular branches e PRs automaticamente
                    </Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Adicionar</Button>
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
            <p>Nenhum repositório vinculado</p>
            <p className="text-sm">Adicione um repositório para começar a rastrear atividade Git</p>
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
                    {getProviderIcon(repo.git_integrations?.provider || '')}
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
                      <span>•</span>
                      <span className="font-mono text-xs">{repo.default_branch}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={repo.auto_link_branches}
                          readOnly
                          className="rounded border-gray-300"
                        />
                        Branches
                      </label>
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={repo.auto_link_prs}
                          readOnly
                          className="rounded border-gray-300"
                        />
                        PRs
                      </label>
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={repo.auto_link_commits}
                          readOnly
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
