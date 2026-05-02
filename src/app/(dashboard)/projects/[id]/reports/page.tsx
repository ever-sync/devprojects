import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProjectTabs } from '@/components/projects/ProjectTabs'
import { PageHeader } from '@/components/layout/PageHeader'
import { ClientStatusReportPanel } from '@/components/projects/ClientStatusReportPanel'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ReportsPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect(`/projects/${id}`)

  const { data: project } = await supabase
    .from('projects')
    .select('name, type, clients(name)')
    .eq('id', id)
    .single()

  if (!project) notFound()

  const { data: reports } = await supabase
    .from('client_status_reports')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <PageHeader
        title={project.name}
        description={(project.clients as { name: string } | null)?.name}
        breadcrumb={[
          { label: 'Projetos', href: '/projects' },
          { label: project.name, href: `/projects/${id}` },
          { label: 'Relatórios' },
        ]}
      />
      <ProjectTabs projectId={id} isAdmin projectType={project.type} />
      <ClientStatusReportPanel
        projectId={id}
        projectName={project.name}
        reports={reports ?? []}
      />
    </div>
  )
}
