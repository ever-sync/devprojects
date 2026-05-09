import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCSATDashboard } from '@/actions/csat'
import { PageHeader } from '@/components/layout/PageHeader'
import { CSATDashboard } from '@/components/csat/CSATDashboard'

export default async function CSATPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data } = await getCSATDashboard()

  return (
    <div className="space-y-6">
      <PageHeader title="CSAT / NPS" description="Avaliações de satisfação dos clientes." />
      <CSATDashboard data={data} />
    </div>
  )
}
