import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProjectTimeEntries } from '@/actions/time-entries'
import { PageHeader } from '@/components/layout/PageHeader'
import { ProjectTabs } from '@/components/projects/ProjectTabs'
import { TimeEntriesPanel } from '@/components/projects/TimeEntriesPanel'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProjectHoursPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: project }, { data: tasks }, entriesRes] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('projects').select('id, name, type').eq('id', id).single(),
    supabase.from('tasks').select('id, title').eq('project_id', id).order('title'),
    getProjectTimeEntries(id),
  ])

  if (!project) notFound()

  const isAdmin = profile?.role === 'admin'
  if (!isAdmin) redirect(`/projects/${id}`)

  return (
    <div>
      <PageHeader
        title="Horas"
        breadcrumb={[
          { label: project.name, href: `/projects/${id}` },
          { label: 'Horas' },
        ]}
      />

      <ProjectTabs projectId={id} isAdmin={isAdmin} projectType={project.type} />

      <TimeEntriesPanel
        projectId={id}
        entries={entriesRes.data ?? []}
        tasks={tasks ?? []}
        isAdmin={isAdmin}
      />
    </div>
  )
}
