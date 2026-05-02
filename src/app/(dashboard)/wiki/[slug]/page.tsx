import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getWikiPage, getWikiPages } from '@/actions/wiki'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default async function WikiPageView({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  if (slug === 'new') {
    // Render editor for new page
    const { default: NewWikiPage } = await import('../new/page')
    return <NewWikiPage />
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  const { page, error } = await getWikiPage(slug)
  if (error || !page) notFound()

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <span className="text-2xl">{page.icon ?? '📄'}</span>
            <span>
              Editado por <strong>{page.updater?.full_name ?? page.author?.full_name ?? 'alguém'}</strong>{' '}
              {formatDistanceToNow(new Date(page.updated_at), { addSuffix: true, locale: ptBR })}
            </span>
          </div>
          <h1 className="text-2xl font-bold">{page.title}</h1>
        </div>
        {isAdmin && (
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" asChild className="gap-2">
              <Link href={`/wiki/${slug}/edit`}><Pencil className="h-4 w-4" />Editar</Link>
            </Button>
          </div>
        )}
      </div>

      <div className="prose prose-sm dark:prose-invert max-w-none rounded-xl border border-border bg-card p-6 whitespace-pre-wrap text-sm leading-relaxed">
        {page.content || <span className="text-muted-foreground italic">Página sem conteúdo.</span>}
      </div>
    </div>
  )
}
