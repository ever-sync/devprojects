import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClientForm } from '@/components/clients/ClientForm'
import { PageHeader } from '@/components/layout/PageHeader'
import type { Client } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditClientPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  if (!client) notFound()

  return (
    <div>
      <PageHeader
        title={`Editar — ${client.name}`}
        breadcrumb={[
          { label: 'Clientes', href: '/clients' },
          { label: client.name, href: `/clients/${id}` },
          { label: 'Editar' },
        ]}
      />
      <div className="mt-6">
        <ClientForm client={client as Client} />
      </div>
    </div>
  )
}
