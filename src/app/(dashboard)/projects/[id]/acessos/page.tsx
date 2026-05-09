import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/PageHeader'
import { ProjectTabs } from '@/components/projects/ProjectTabs'
import { ProjectAccesses } from '@/components/projects/ProjectAccesses'
import { listProjectAccesses } from '@/actions/project-accesses'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AcessosPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const { data: project } = await supabase
    .from('projects')
    .select('id, name, type')
    .eq('id', id)
    .single()

  if (!project) notFound()

  const { data: accesses } = await listProjectAccesses(id)
  const isAdmin = profile?.role === 'admin'

  return (
    <div>
      <PageHeader
        title="Acessos"
        description="Credenciais e chaves de API do projeto"
        breadcrumb={[
          { label: 'Projetos', href: '/projects' },
          { label: project.name, href: `/projects/${id}` },
          { label: 'Acessos' },
        ]}
      />

      <ProjectTabs projectId={id} isAdmin={isAdmin} projectType={project.type} />

      <ProjectAccesses
        accesses={accesses ?? []}
        projectId={id}
        isAdmin={isAdmin}
      />
    </div>
  )
}
