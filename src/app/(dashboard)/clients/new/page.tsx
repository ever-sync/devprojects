import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClientForm } from '@/components/clients/ClientForm'
import { PageHeader } from '@/components/layout/PageHeader'

export default async function NewClientPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  return (
    <div>
      <PageHeader
        title="Novo Cliente"
        breadcrumb={[{ label: 'Clientes', href: '/clients' }, { label: 'Novo' }]}
      />
      <ClientForm />
    </div>
  )
}
