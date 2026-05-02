import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getWikiPage, getWikiPages } from '@/actions/wiki'
import { PageHeader } from '@/components/layout/PageHeader'
import { WikiEditor } from '@/components/wiki/WikiEditor'

export default async function EditWikiPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect(`/wiki/${slug}`)

  const [{ page, error }, { pages }] = await Promise.all([getWikiPage(slug), getWikiPages()])
  if (error || !page) notFound()

  return (
    <div className="space-y-6">
      <PageHeader title={`Editando: ${page.title}`} description="Altere o conteúdo desta página." />
      <WikiEditor page={page} parentPages={pages.map((p) => ({ id: p.id, title: p.title, slug: p.slug }))} />
    </div>
  )
}
