import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getWikiPages } from '@/actions/wiki'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Plus, BookOpen } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default async function WikiIndexPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const { pages } = await getWikiPages()
  const isAdmin = profile?.role === 'admin'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wiki"
        description="Base de conhecimento interna da equipe."
        action={isAdmin ? (
          <Button asChild size="sm" className="gap-2">
            <Link href="/wiki/new"><Plus className="h-4 w-4" />Nova página</Link>
          </Button>
        ) : undefined}
      />
      {pages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">Nenhuma página criada ainda.</p>
          {isAdmin && (
            <Button asChild className="mt-4 gap-2">
              <Link href="/wiki/new"><Plus className="h-4 w-4" />Criar primeira página</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pages.filter((p) => !p.parent_id).map((p) => (
            <Link
              key={p.id}
              href={`/wiki/${p.slug}`}
              className="rounded-xl border border-border bg-card p-5 hover:bg-muted/40 transition-colors group"
            >
              <div className="text-3xl mb-3">{p.icon ?? '📄'}</div>
              <h3 className="font-semibold group-hover:text-primary transition-colors">{p.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Atualizado {formatDistanceToNow(new Date(p.updated_at), { addSuffix: true, locale: ptBR })}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
