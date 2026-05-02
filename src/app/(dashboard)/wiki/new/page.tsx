import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getWikiPages } from '@/actions/wiki'
import { PageHeader } from '@/components/layout/PageHeader'
import { WikiEditor } from '@/components/wiki/WikiEditor'

export default async function NewWikiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/wiki')
  const { pages } = await getWikiPages()

  return (
    <div className="space-y-6">
      <PageHeader title="Nova página" description="Crie uma nova página na wiki da equipe." />
      <WikiEditor parentPages={pages.map((p) => ({ id: p.id, title: p.title, slug: p.slug }))} />
    </div>
  )
}
