import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ClientsGrid } from '@/components/clients/ClientsGrid'
import { Button } from '@/components/ui/button'
import { Users, Plus } from 'lucide-react'
import Link from 'next/link'
import type { Client } from '@/types'

const PAGE_SIZE = 12

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const [{ data: clients }, { count }] = await Promise.all([
    supabase.from('clients').select('*').order('name').range(0, PAGE_SIZE - 1),
    supabase.from('clients').select('*', { count: 'exact', head: true }),
  ])

  const allClients = clients ?? []
  const totalCount = count ?? 0

  return (
    <div>
      <PageHeader
        title="Clientes"
        description={`${totalCount} cliente(s)`}
        action={
          <Button asChild size="sm">
            <Link href="/clients/new">
              <Plus className="w-4 h-4 mr-1" />
              Novo Cliente
            </Link>
          </Button>
        }
      />

      {allClients.length === 0 ? (
        <EmptyState
          icon={<Users className="w-12 h-12" />}
          title="Nenhum cliente"
          description="Cadastre o primeiro cliente para criar projetos."
          action={
            <Button asChild size="sm">
              <Link href="/clients/new">Cadastrar Cliente</Link>
            </Button>
          }
        />
      ) : (
        <ClientsGrid
          initialItems={allClients as Client[]}
          totalCount={totalCount}
        />
      )}
    </div>
  )
}
