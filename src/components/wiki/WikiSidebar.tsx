'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { BookOpen, ChevronRight, Plus } from 'lucide-react'
import type { WikiPageMeta } from '@/actions/wiki'

interface WikiSidebarProps {
  pages: WikiPageMeta[]
  isAdmin: boolean
}

function buildTree(pages: WikiPageMeta[]) {
  const roots: WikiPageMeta[] = []
  const children: Record<string, WikiPageMeta[]> = {}
  for (const p of pages) {
    if (p.parent_id) {
      children[p.parent_id] = [...(children[p.parent_id] ?? []), p]
    } else {
      roots.push(p)
    }
  }
  return { roots, children }
}

function NavItem({ page, children, depth = 0 }: { page: WikiPageMeta; children?: WikiPageMeta[]; depth?: number }) {
  const pathname = usePathname()
  const active = pathname === `/wiki/${page.slug}`
  return (
    <li>
      <Link
        href={`/wiki/${page.slug}`}
        className={cn(
          'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
          depth > 0 && 'ml-4',
          active
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        )}
      >
        <span className="text-base">{page.icon ?? '📄'}</span>
        <span className="truncate">{page.title}</span>
        {children && children.length > 0 && <ChevronRight className="ml-auto h-3 w-3 shrink-0" />}
      </Link>
      {children && children.length > 0 && (
        <ul className="mt-0.5 space-y-0.5">
          {children.map((c) => <NavItem key={c.id} page={c} depth={depth + 1} />)}
        </ul>
      )}
    </li>
  )
}

export function WikiSidebar({ pages, isAdmin }: WikiSidebarProps) {
  const { roots, children } = buildTree(pages)

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-card/50 p-3 overflow-y-auto">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <BookOpen className="h-4 w-4 text-primary" />
          Wiki
        </div>
        {isAdmin && (
          <Link
            href="/wiki/new"
            className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title="Nova página"
          >
            <Plus className="h-4 w-4" />
          </Link>
        )}
      </div>
      {roots.length === 0 ? (
        <p className="px-3 text-xs text-muted-foreground">Nenhuma página ainda.</p>
      ) : (
        <ul className="space-y-0.5">
          {roots.map((p) => <NavItem key={p.id} page={p} children={children[p.id]} />)}
        </ul>
      )}
    </aside>
  )
}
