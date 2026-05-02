'use client'

import { useRouter, usePathname } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { useState, useTransition } from 'react'

interface AuditLog {
  id: string
  action: string
  entity_type: string
  entity_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  actor: {
    full_name: string
    email: string
    avatar_url: string | null
  } | null
}

interface AuditLogTableProps {
  logs: AuditLog[]
  total: number
  page: number
  pageSize: number
  filters: { action?: string; entity?: string }
}

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-500/10 text-green-600',
  update: 'bg-blue-500/10 text-blue-600',
  delete: 'bg-red-500/10 text-red-600',
  login: 'bg-purple-500/10 text-purple-600',
  logout: 'bg-gray-500/10 text-gray-600',
}

export function AuditLogTable({ logs, total, page, pageSize, filters }: AuditLogTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()
  const [entityFilter, setEntityFilter] = useState(filters.entity ?? '')

  const totalPages = Math.ceil(total / pageSize)

  function navigate(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams()
    const merged = { page: String(page), action: filters.action, entity: filters.entity, ...updates }
    Object.entries(merged).forEach(([k, v]) => { if (v) params.set(k, v) })
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filtrar por entidade..."
            className="pl-9"
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') navigate({ entity: entityFilter || undefined, page: '1' }) }}
          />
        </div>
        {(filters.action || filters.entity) && (
          <Button variant="ghost" size="sm" onClick={() => navigate({ action: undefined, entity: undefined, page: '1' })}>
            Limpar filtros
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ação</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Entidade</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Usuário</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Detalhes</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Quando</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhum log encontrado.
                </td>
              </tr>
            )}
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      ACTION_COLORS[log.action] ?? 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    className="text-foreground hover:text-primary transition-colors"
                    onClick={() => navigate({ entity: log.entity_type, page: '1' })}
                  >
                    {log.entity_type}
                  </button>
                  {log.entity_id && (
                    <span className="ml-1 text-xs text-muted-foreground font-mono">
                      #{log.entity_id.slice(0, 8)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {log.actor ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={log.actor.avatar_url ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {log.actor.full_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-foreground">{log.actor.full_name}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Sistema</span>
                  )}
                </td>
                <td className="px-4 py-3 max-w-xs truncate text-muted-foreground font-mono text-xs">
                  {Object.keys(log.metadata ?? {}).length > 0
                    ? JSON.stringify(log.metadata).slice(0, 80)
                    : '—'}
                </td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{total} registros · página {page} de {totalPages}</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => navigate({ page: String(page - 1) })}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => navigate({ page: String(page + 1) })}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
