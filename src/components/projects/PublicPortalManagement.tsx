'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { 
  Link as LinkIcon, 
  Copy, 
  Check, 
  RefreshCw, 
  ExternalLink,
  ShieldAlert
} from 'lucide-react'
import { toast } from 'sonner'
import { generatePublicToken, togglePublicPortal, revokePublicToken } from '@/actions/public-portal'

interface PublicPortalManagementProps {
  projectId: string
  publicToken: string | null
  publicEnabled: boolean
  featureEnabled?: boolean
}

export function PublicPortalManagement({ 
  projectId, 
  publicToken, 
  publicEnabled: initialEnabled,
  featureEnabled = true,
}: PublicPortalManagementProps) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [token, setToken] = useState(publicToken)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const publicUrl = token ? `${window.location.origin}/p/${token}` : ''

  if (!featureEnabled) {
    return (
      <div className="bg-card rounded-xl border border-border p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Portal Publico</h3>
            <p className="text-[10px] text-muted-foreground">
              Recurso disponivel apenas em planos superiores.
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Faca upgrade do workspace para liberar compartilhamento publico por link.
        </p>
      </div>
    )
  }

  async function handleToggle(val: boolean) {
    setLoading(true)
    const res = await togglePublicPortal(projectId, val)
    if (res.error) {
      toast.error(res.error)
    } else {
      setEnabled(val)
      toast.success(val ? 'Portal público ativado' : 'Portal público desativado')
    }
    setLoading(false)
  }

  async function handleGenerate() {
    setLoading(true)
    const res = await generatePublicToken(projectId)
    if (res.error) {
      toast.error(res.error)
    } else {
      setToken(res.token ?? null)
      setEnabled(true)
      toast.success('Novo link gerado com sucesso')
    }
    setLoading(false)
  }

  async function handleRevoke() {
    setLoading(true)
    const res = await revokePublicToken(projectId)
    if (res.error) {
      toast.error(res.error)
    } else {
      setToken(null)
      setEnabled(false)
      toast.success('Link público revogado')
    }
    setLoading(false)
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    toast.success('Link copiado para a área de transferência')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-card rounded-xl border border-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <LinkIcon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Link Público</h3>
            <p className="text-[10px] text-muted-foreground">Compartilhe o progresso com o cliente</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="public-enabled" className="text-xs text-muted-foreground cursor-pointer">
            {enabled ? 'Ativo' : 'Inativo'}
          </Label>
          <Switch 
            id="public-enabled" 
            checked={enabled} 
            onCheckedChange={handleToggle}
            disabled={loading || !token}
          />
        </div>
      </div>

      {token ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input 
                value={publicUrl} 
                readOnly 
                className="pr-20 text-xs bg-muted/50 truncate"
              />
              <div className="absolute right-1 top-1 bottom-1 flex items-center gap-1">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-7 w-7" 
                  onClick={copyToClipboard}
                >
                  {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-7 w-7" 
                  asChild
                >
                  <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </Button>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleGenerate}
              disabled={loading}
              title="Gerar novo link (revoga o antigo)"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          
          <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
            <ShieldAlert className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
            <p className="text-[10px] text-yellow-600 dark:text-yellow-400">
              Qualquer pessoa com este link pode ver o progresso do projeto sem login.
            </p>
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-red-500 hover:text-red-600 hover:bg-red-500/10 h-8 text-xs"
            onClick={handleRevoke}
            disabled={loading}
          >
            Revogar acesso público
          </Button>
        </div>
      ) : (
        <Button 
          className="w-full h-9 text-xs" 
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? 'Gerando...' : 'Gerar Link Público'}
        </Button>
      )}
    </div>
  )
}
