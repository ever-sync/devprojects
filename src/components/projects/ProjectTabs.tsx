'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

type Tab = { label: string; key: string }

const BASE_ADMIN_TABS: Tab[] = [
  { label: 'Visao Geral', key: '' },
  { label: 'Escopo', key: 'scope' },
  { label: 'Tarefas', key: 'tasks' },
  { label: 'Execucao', key: 'execution' },
  { label: 'Aprovacoes', key: 'approvals' },
  { label: 'Horas', key: 'hours' },
  { label: 'Financeiro', key: 'finance' },
  { label: 'Timeline', key: 'timeline' },
  { label: 'Calendario', key: 'calendar' },
  { label: 'Documentos', key: 'documents' },
  { label: 'Atividade', key: 'activity' },
  { label: 'Relatorios', key: 'reports' },
]

// Abas extras por tipo de projeto (apenas para admin)
const TYPE_EXTRA_TABS: Record<string, Tab[]> = {
  automation: [{ label: 'Workflows N8N', key: 'n8n-workflows' }],
  ai_agent: [{ label: 'Scripts IA', key: 'ai-scripts' }],
  saas: [],
}

const CLIENT_TABS: Tab[] = [
  { label: 'Visao Geral', key: '' },
  { label: 'Tarefas', key: 'tasks' },
  { label: 'Aprovacoes', key: 'approvals' },
  { label: 'Timeline', key: 'timeline' },
  { label: 'Calendario', key: 'calendar' },
  { label: 'Documentos', key: 'documents' },
  { label: 'Atividade', key: 'activity' },
]

const UNREAD_THRESHOLD_MS = 12 * 60 * 60 * 1000

export function ProjectTabs({
  projectId,
  isAdmin,
  projectType,
}: {
  projectId: string
  isAdmin?: boolean
  projectType?: string | null
}) {
  const pathname = usePathname()
  const base = `/projects/${projectId}`
  const [hasUnread, setHasUnread] = useState(false)

  useEffect(() => {
    if (pathname === `${base}/activity`) {
      localStorage.setItem(`lastActivityVisit:${projectId}`, Date.now().toString())
      queueMicrotask(() => setHasUnread(false))
      return
    }

    const key = `lastActivityVisit:${projectId}`
    const last = window.localStorage.getItem(key)
    if (!last) {
      queueMicrotask(() => setHasUnread(true))
      return
    }

    const elapsed = Date.now() - parseInt(last, 10)
    queueMicrotask(() => setHasUnread(elapsed > UNREAD_THRESHOLD_MS))
  }, [pathname, base, projectId])

  const typeExtras = projectType ? (TYPE_EXTRA_TABS[projectType] ?? []) : []
  const tabs = isAdmin
    ? [...BASE_ADMIN_TABS, ...typeExtras, { label: 'Produtividade', key: 'productivity' }]
    : CLIENT_TABS

  return (
    <div className="mb-6 border-b border-border">
      <div className="flex gap-1 overflow-x-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent md:flex-wrap md:overflow-x-visible">
      {tabs.map((tab) => {
        const href = tab.key ? `${base}/${tab.key}` : base
        const isActive = tab.key
          ? pathname === href || pathname.startsWith(`${href}/`)
          : pathname === base

        return (
          <Link
            key={href}
            href={href}
            className={`relative whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
            }`}
          >
            {tab.label}
            {tab.key === 'activity' && hasUnread && (
              <span className="absolute right-1.5 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
            )}
          </Link>
        )
      })}
      </div>
    </div>
  )
}
