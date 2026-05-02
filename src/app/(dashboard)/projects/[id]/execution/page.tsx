import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProjectExecutionData } from '@/actions/execution'
import { PageHeader } from '@/components/layout/PageHeader'
import { ExecutionPanel } from '@/components/projects/ExecutionPanel'
import { ProjectTabs } from '@/components/projects/ProjectTabs'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProjectExecutionPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: project }, { data: membership }, executionData] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('projects').select('id, name, type').eq('id', id).single(),
    supabase.from('workspace_members').select('workspace_id').eq('user_id', user.id).single(),
    getProjectExecutionData(id),
  ])

  if (!project) notFound()

  const isAdmin = profile?.role === 'admin'
  if (!isAdmin) redirect(`/projects/${id}`)

  return (
    <div>
      <PageHeader
        title="Execucao"
        breadcrumb={[
          { label: project.name, href: `/projects/${id}` },
          { label: 'Execucao' },
        ]}
      />

      <ProjectTabs projectId={id} isAdmin={isAdmin} projectType={project.type} />

      <ExecutionPanel
        projectId={id}
        workspaceId={membership?.workspace_id}
        tasks={executionData.tasks}
        dependencies={executionData.dependencies}
        risks={executionData.risks}
        capacities={executionData.capacities}
        teamMembers={executionData.teamMembers}
      />
    </div>
  )
}
