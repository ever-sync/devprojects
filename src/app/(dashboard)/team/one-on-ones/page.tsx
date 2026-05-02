import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOneOnOnes, getTeamMembers } from '@/actions/one-on-ones'
import { PageHeader } from '@/components/layout/PageHeader'
import { OneOnOnePanel } from '@/components/team/OneOnOnePanel'

export default async function OneOnOnesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ items }, { members }] = await Promise.all([
    getOneOnOnes(),
    getTeamMembers(),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="1:1s"
        description="Reuniões individuais com pautas e action items."
      />
      <OneOnOnePanel items={items} members={members} currentUserId={user.id} />
    </div>
  )
}
