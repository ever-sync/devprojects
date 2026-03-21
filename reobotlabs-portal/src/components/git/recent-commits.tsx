'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { GitCommit, GitBranch, GitMerge, ExternalLink, Clock, FileChanged, Plus, Minus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { listCommits } from '@/actions/git-integrations'

interface Commit {
  id: string
  task_id: string | null
  project_id: string
  repository_id: string
  commit_sha: string
  commit_message: string
  commit_url: string
  author_name: string | null
  author_email: string | null
  author_avatar: string | null
  committed_at: string
  files_changed: number
  additions: number
  deletions: number
  created_at: string
  project_repositories: {
    repo_name: string
    git_integrations: {
      provider: string
    } | null
  } | null
}

interface RecentCommitsProps {
  projectId: string
  taskId?: string
  limit?: number
}

export function RecentCommits({ projectId, taskId, limit = 10 }: RecentCommitsProps) {
  const [commits, setCommits] = useState<Commit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCommits()
  }, [projectId, taskId, limit])

  async function loadCommits() {
    setLoading(true)
    const result = await listCommits({
      projectId: taskId ? undefined : projectId,
      taskId,
      limit,
    })
    if (result.commits) {
      setCommits(result.commits)
    }
    setLoading(false)
  }

  function getShortSha(sha: string) {
    return sha.substring(0, 7)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCommit className="h-5 w-5" />
            Commits Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitCommit className="h-5 w-5" />
          Commits Recentes
        </CardTitle>
        <CardDescription>
          {taskId ? 'Commits vinculados a esta tarefa' : 'Atividade de commits do projeto'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {commits.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <GitCommit className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum commit registrado</p>
            <p className="text-sm">Commits aparecerão aqui quando vinculados a tarefas</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {commits.map((commit) => (
                <div
                  key={commit.id}
                  className="flex gap-3 pb-4 border-b last:border-0"
                >
                  <div className="flex-shrink-0">
                    {commit.author_avatar ? (
                      <img
                        src={commit.author_avatar}
                        alt={commit.author_name || 'Author'}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <GitCommit className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {commit.commit_message}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>{commit.author_name || 'Unknown'}</span>
                          <span>•</span>
                          <a
                            href={commit.commit_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:text-primary transition-colors font-mono"
                          >
                            {getShortSha(commit.commit_sha)}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                      <Badge variant="outline" className="flex-shrink-0 text-xs">
                        {commit.project_repositories?.git_integrations?.provider || 'git'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(commit.committed_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                      {commit.files_changed !== null && commit.files_changed > 0 && (
                        <>
                          <span className="flex items-center gap-1">
                            <FileChanged className="h-3 w-3" />
                            {commit.files_changed} arquivos
                          </span>
                          {commit.additions !== null && commit.additions > 0 && (
                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                              <Plus className="h-3 w-3" />
                              {commit.additions}
                            </span>
                          )}
                          {commit.deletions !== null && commit.deletions > 0 && (
                            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                              <Minus className="h-3 w-3" />
                              {commit.deletions}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
