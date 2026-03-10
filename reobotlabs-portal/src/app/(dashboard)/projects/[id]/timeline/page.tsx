import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TimelineContainer } from '@/components/timeline/TimelineContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { ProjectTabs } from '@/components/projects/ProjectTabs'

interface Props {
  params: Promise<{ id: string }>
}

export default async function TimelinePage({ params }: Props) {
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
    .select('id, name')
    .eq('id', id)
    .single()

  if (!project) notFound()

  const { data: phases } = await supabase
    .from('project_phases')
    .select('*')
    .eq('project_id', id)
    .order('order_index')

  const isAdmin = profile?.role === 'admin'

  return (
    <div>
      <PageHeader
        title="Timeline"
        breadcrumb={[
          { label: project.name, href: `/projects/${id}` },
          { label: 'Timeline' },
        ]}
      />

      <ProjectTabs projectId={id} isAdmin={isAdmin} />

      <TimelineContainer
        phases={phases ?? []}
        projectId={id}
        isAdmin={isAdmin}
      />
    </div>
  )
}
