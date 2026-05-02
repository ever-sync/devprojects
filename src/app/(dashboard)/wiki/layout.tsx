import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getWikiPages } from '@/actions/wiki'
import { WikiSidebar } from '@/components/wiki/WikiSidebar'

export default async function WikiLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const { pages } = await getWikiPages()

  return (
    <div className="flex h-full -m-4 md:-m-6">
      <WikiSidebar pages={pages} isAdmin={profile?.role === 'admin'} />
      <div className="flex-1 overflow-y-auto p-6">{children}</div>
    </div>
  )
}
