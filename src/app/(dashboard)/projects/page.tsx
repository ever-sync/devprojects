import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ProjectsGrid } from '@/components/projects/ProjectsGrid'
import { Button } from '@/components/ui/button'
import { FolderKanban, Plus } from 'lucide-react'
import Link from 'next/link'
import type { Project, Client } from '@/types'

const PAGE_SIZE = 12

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  const [{ data: projects }, { count }] = await Promise.all([
    supabase
      .from('projects')
      .select('*, clients(name)')
      .order('updated_at', { ascending: false })
      .range(0, PAGE_SIZE - 1),
    supabase.from('projects').select('*', { count: 'exact', head: true }),
  ])

  const allProjects = projects ?? []
  const totalCount = count ?? 0

  return (
    <div>
      <PageHeader
        title={isAdmin ? 'Todos os Projetos' : 'Meus Projetos'}
        description={
          isAdmin
            ? `${totalCount} projeto(s)`
            : 'Acompanhe cronograma, entregas, aprovacoes e documentos dos seus projetos.'
        }
        action={
          isAdmin ? (
            <Button asChild size="sm">
              <Link href="/projects/new">
                <Plus className="w-4 h-4 mr-1" />
                Novo Projeto
              </Link>
            </Button>
          ) : undefined
        }
      />

      {allProjects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="w-12 h-12" />}
          title={isAdmin ? 'Nenhum projeto' : 'Nenhum projeto disponivel'}
          description={
            isAdmin
              ? 'Crie o primeiro projeto para um cliente.'
              : 'Assim que um projeto estiver vinculado ao seu acesso, ele aparecera aqui.'
          }
          action={
            isAdmin ? (
              <Button asChild size="sm">
                <Link href="/projects/new">Criar Projeto</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ProjectsGrid
          initialItems={allProjects as (Project & { clients?: Pick<Client, 'name'> | null })[]}
          totalCount={totalCount}
        />
      )}
    </div>
  )
}
