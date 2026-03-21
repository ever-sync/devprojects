'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Rocket, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Loader2,
  GitBranch,
  Terminal
} from 'lucide-react'
import { formatDistanceToNow, formatDuration } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { listDeployments } from '@/actions/git-integrations'

interface Deployment {
  id: string
  project_id: string
  repository_id: string | null
  environment: 'development' | 'staging' | 'production' | 'preview'
  deployment_url: string | null
  status: 'pending' | 'building' | 'success' | 'failure' | 'cancelled'
  commit_sha: string | null
  branch_name: string | null
  deployed_by: string | null
  started_at: string | null
  completed_at: string | null
  duration_seconds: number | null
  logs_url: string | null
  error_message: string | null
  metadata: Record<string, any>
  created_at: string
  profiles: {
    full_name: string | null
    avatar_url: string | null
  } | null
}

interface DeploymentsListProps {
  projectId: string
  limit?: number
}

export function DeploymentsList({ projectId, limit = 10 }: DeploymentsListProps) {
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDeployments()
  }, [projectId, limit])

  async function loadDeployments() {
    setLoading(true)
    const result = await listDeployments(projectId, limit)
    if (result.deployments) {
      setDeployments(result.deployments)
    }
    setLoading(false)
  }

  function getStatusIcon(status: Deployment['status']) {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'building':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'failure':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-gray-600" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  function getStatusLabel(status: Deployment['status']) {
    const labels = {
      pending: 'Pendente',
      building: 'Construindo',
      success: 'Sucesso',
      failure: 'Falhou',
      cancelled: 'Cancelado',
    }
    return labels[status] || status
  }

  function getEnvironmentBadgeVariant(env: Deployment['environment']) {
    const variants = {
      development: 'secondary',
      staging: 'default',
      production: 'destructive',
      preview: 'outline',
    }
    return variants[env] || 'outline' as const
  }

  function getEnvironmentLabel(env: Deployment['environment']) {
    const labels = {
      development: 'Desenvolvimento',
      staging: 'Staging',
      production: 'Produção',
      preview: 'Preview',
    }
    return labels[env] || env
  }

  function formatDurationStr(seconds: number | null) {
    if (!seconds) return null
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (minutes > 0) {
      return `${minutes}m ${secs}s`
    }
    return `${secs}s`
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Deployments
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
          <Rocket className="h-5 w-5" />
          Deployments
        </CardTitle>
        <CardDescription>
          Histórico de implantações do projeto
        </CardDescription>
      </CardHeader>
      <CardContent>
        {deployments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Rocket className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum deployment registrado</p>
            <p className="text-sm">Deployments aparecerão aqui quando realizados</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {deployments.map((deployment) => (
                <div
                  key={deployment.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-shrink-0">
                    {getStatusIcon(deployment.status)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={getEnvironmentBadgeVariant(deployment.environment)} className="text-xs">
                        {getEnvironmentLabel(deployment.environment)}
                      </Badge>
                      <span className="font-medium">{getStatusLabel(deployment.status)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      {deployment.branch_name && (
                        <span className="flex items-center gap-1 font-mono">
                          <GitBranch className="h-3 w-3" />
                          {deployment.branch_name}
                        </span>
                      )}
                      {deployment.commit_sha && (
                        <span className="font-mono">
                          {deployment.commit_sha.substring(0, 7)}
                        </span>
                      )}
                      {deployment.started_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(deployment.started_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      )}
                      {deployment.duration_seconds && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDurationStr(deployment.duration_seconds)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {deployment.logs_url && (
                      <Button variant="ghost" size="icon" asChild>
                        <a href={deployment.logs_url} target="_blank" rel="noopener noreferrer">
                          <Terminal className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {deployment.deployment_url && (
                      <Button variant="ghost" size="icon" asChild>
                        <a href={deployment.deployment_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
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
