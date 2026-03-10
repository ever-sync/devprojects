'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { createClient } from '@/lib/supabase/client'
import { FolderKanban, CheckSquare } from 'lucide-react'
import { PROJECT_TYPE_LABELS } from '@/lib/constants'

interface SearchResult {
  id: string
  type: 'project' | 'task'
  label: string
  sub?: string
  href: string
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const loadResults = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const [projectsRes, tasksRes] = await Promise.all([
      supabase
        .from('projects')
        .select('id, name, type')
        .order('updated_at', { ascending: false })
        .limit(30),
      supabase
        .from('tasks')
        .select('id, title, project_id')
        .neq('status', 'done')
        .order('updated_at', { ascending: false })
        .limit(30),
    ])

    const items: SearchResult[] = [
      ...(projectsRes.data ?? []).map((p) => ({
        id: p.id,
        type: 'project' as const,
        label: p.name,
        sub: PROJECT_TYPE_LABELS[p.type] ?? p.type,
        href: `/projects/${p.id}`,
      })),
      ...(tasksRes.data ?? []).map((t) => ({
        id: t.id,
        type: 'task' as const,
        label: t.title,
        href: `/projects/${t.project_id}/tasks`,
      })),
    ]

    setResults(items)
    setLoading(false)
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((v) => {
          const next = !v
          if (next) void loadResults()
          return next
        })
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [loadResults])

  function handleSelect(href: string) {
    setOpen(false)
    router.push(href)
  }

  const projectResults = results.filter((r) => r.type === 'project')
  const taskResults = results.filter((r) => r.type === 'task')

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) void loadResults()
      }}
    >
      <CommandInput placeholder="Buscar projetos, tarefas..." />
      <CommandList>
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Carregando...
          </div>
        ) : (
          <>
            <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

            {projectResults.length > 0 && (
              <CommandGroup heading="Projetos">
                {projectResults.map((r) => (
                  <CommandItem
                    key={r.id}
                    value={r.label}
                    onSelect={() => handleSelect(r.href)}
                  >
                    <FolderKanban className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
                    <span className="flex-1">{r.label}</span>
                    {r.sub && (
                      <span className="ml-2 text-xs text-muted-foreground">{r.sub}</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {taskResults.length > 0 && (
              <CommandGroup heading="Tarefas em Aberto">
                {taskResults.map((r) => (
                  <CommandItem
                    key={r.id}
                    value={r.label}
                    onSelect={() => handleSelect(r.href)}
                  >
                    <CheckSquare className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
                    <span className="truncate">{r.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
