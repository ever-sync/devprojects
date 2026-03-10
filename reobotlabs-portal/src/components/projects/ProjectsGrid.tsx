'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { ProjectCard } from '@/components/dashboard/ProjectCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/shared/EmptyState'
import { Loader2, Search, FolderKanban, X } from 'lucide-react'
import { fetchMoreProjects, searchProjects } from '@/actions/pagination'
import type { Project, Client } from '@/types'

type ProjectWithClient = Project & { clients?: Pick<Client, 'name'> | null }

const STATUS_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Ativos' },
  { value: 'paused', label: 'Pausados' },
  { value: 'completed', label: 'Concluídos' },
  { value: 'cancelled', label: 'Cancelados' },
]

const TYPE_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'saas', label: 'SaaS' },
  { value: 'automation', label: 'Automação' },
  { value: 'ai_agent', label: 'AI Agent' },
]

interface ProjectsGridProps {
  initialItems: ProjectWithClient[]
  totalCount: number
}

export function ProjectsGrid({ initialItems, totalCount }: ProjectsGridProps) {
  const [items, setItems] = useState<ProjectWithClient[]>(initialItems)
  const [displayCount, setDisplayCount] = useState(totalCount)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [type, setType] = useState('all')
  const [isFiltered, setIsFiltered] = useState(false)
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hasFilters = query.trim() !== '' || status !== 'all' || type !== 'all'

  useEffect(() => {
    if (!hasFilters) {
      setItems(initialItems)
      setDisplayCount(totalCount)
      setIsFiltered(false)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const results = await searchProjects(query, status, type)
        setItems(results as ProjectWithClient[])
        setDisplayCount(results.length)
        setIsFiltered(true)
      })
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, status, type])

  function clearFilters() {
    setQuery('')
    setStatus('all')
    setType('all')
  }

  async function handleLoadMore() {
    setIsLoadingMore(true)
    const next = await fetchMoreProjects(items.length)
    setItems((prev) => [...prev, ...(next as ProjectWithClient[])])
    setIsLoadingMore(false)
  }

  const hasMore = !isFiltered && items.length < totalCount

  return (
    <div className="space-y-4">
      {/* Search + filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar projetos..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 pr-9 h-9"
          />
          {query && (
            <button
              type="button"
              title="Limpar busca"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 flex-wrap">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatus(f.value)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  status === f.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-border hidden sm:block" />

          <div className="flex items-center gap-1 flex-wrap">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setType(f.value)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  type === f.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="px-2.5 py-1 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 ml-auto"
            >
              <X className="w-3 h-3" />
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {isPending ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="w-10 h-10" />}
          title="Nenhum projeto encontrado"
          description="Tente ajustar os filtros ou o termo de busca."
          action={
            hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm text-primary hover:underline"
              >
                Limpar filtros
              </button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((project) => (
              <ProjectCard
                key={project.id}
                project={project as Parameters<typeof ProjectCard>[0]['project']}
                showClient
              />
            ))}
          </div>

          {isFiltered && (
            <p className="text-xs text-muted-foreground text-center">
              {displayCount} resultado{displayCount !== 1 ? 's' : ''} encontrado{displayCount !== 1 ? 's' : ''}
            </p>
          )}

          {hasMore && (
            <div className="flex justify-center">
              <Button variant="outline" size="sm" onClick={handleLoadMore} disabled={isLoadingMore}>
                {isLoadingMore && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
                Carregar mais ({totalCount - items.length} restantes)
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
