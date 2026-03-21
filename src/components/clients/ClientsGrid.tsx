'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/shared/EmptyState'
import { Loader2, Building2, Globe, Search, Users, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { fetchMoreClients, searchClients } from '@/actions/pagination'
import type { Client } from '@/types'

interface ClientsGridProps {
  initialItems: Client[]
  totalCount: number
}

export function ClientsGrid({ initialItems, totalCount }: ClientsGridProps) {
  const [items, setItems] = useState<Client[]>(initialItems)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [query, setQuery] = useState('')
  const [isFiltered, setIsFiltered] = useState(false)
  const [displayCount, setDisplayCount] = useState(totalCount)
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hasFilters = query.trim() !== ''

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
        const results = await searchClients(query)
        setItems(results as Client[])
        setDisplayCount(results.length)
        setIsFiltered(true)
      })
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  async function handleLoadMore() {
    setIsLoadingMore(true)
    const next = await fetchMoreClients(items.length)
    setItems((prev) => [...prev, ...(next as Client[])])
    setIsLoadingMore(false)
  }

  const hasMore = !isFiltered && items.length < totalCount

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar clientes..."
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

      {/* Results */}
      {isPending ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Users className="w-10 h-10" />}
          title="Nenhum cliente encontrado"
          description="Tente ajustar o termo de busca."
          action={
            hasFilters ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-sm text-primary hover:underline"
              >
                Limpar busca
              </button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((client) => (
              <Link key={client.id} href={`/clients/${client.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-border">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                        {client.logo_url ? (
                          <Image
                            src={client.logo_url}
                            alt={client.name}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Building2 className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{client.name}</p>
                        {client.industry && (
                          <p className="text-xs text-muted-foreground mt-0.5">{client.industry}</p>
                        )}
                        {client.website && (
                          <div className="flex items-center gap-1 mt-1">
                            <Globe className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground truncate">{client.website}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
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
