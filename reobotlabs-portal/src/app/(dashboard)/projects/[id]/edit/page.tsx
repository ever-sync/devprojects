import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProjectForm } from '@/components/projects/ProjectForm'
import { PageHeader } from '@/components/layout/PageHeader'
import type { Project } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditProjectPage({ params }: Props) {
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

  const [{ data: project }, { data: clients }] = await Promise.all([
    supabase.from('projects').select('*').eq('id', id).single(),
    supabase.from('clients').select('id, name').order('name'),
  ])

  if (!project) notFound()

  return (
    <div>
      <PageHeader
        title="Editar Projeto"
        breadcrumb={[
          { label: 'Projetos', href: '/projects' },
          { label: project.name, href: `/projects/${id}` },
          { label: 'Editar' },
        ]}
      />
      <ProjectForm clients={clients ?? []} project={project as Project} />
    </div>
  )
}
