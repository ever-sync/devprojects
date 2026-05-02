import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CalendarView } from '@/components/calendar/CalendarView'
import { PageHeader } from '@/components/layout/PageHeader'
import { ProjectTabs } from '@/components/projects/ProjectTabs'
import { MeetingsList } from '@/components/meetings/MeetingsList'
import type { Meeting } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function CalendarPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: project }, { data: profile }] = await Promise.all([
    supabase.from('projects').select('id, name, type').eq('id', id).single(),
    supabase.from('profiles').select('role').eq('id', user.id).single(),
  ])

  if (!project) notFound()

  const isAdmin = profile?.role === 'admin'

  const [{ data: tasks }, { data: phases }, { data: meetings }] = await Promise.all([
    supabase
      .from('tasks')
      .select('id, title, status, priority, due_date')
      .eq('project_id', id),
    supabase
      .from('project_phases')
      .select('id, name, status, estimated_start, estimated_end')
      .eq('project_id', id)
      .order('order_index'),
    supabase
      .from('meetings')
      .select('*')
      .eq('project_id', id)
      .order('scheduled_date', { ascending: false }),
  ])

  return (
    <div>
      <PageHeader
        title="Calendário"
        breadcrumb={[
          { label: project.name, href: `/projects/${id}` },
          { label: 'Calendário' },
        ]}
      />
      <ProjectTabs projectId={id} isAdmin={isAdmin} projectType={project.type} />
      <CalendarView
        tasks={(tasks ?? []) as Parameters<typeof CalendarView>[0]['tasks']}
        phases={(phases ?? []) as Parameters<typeof CalendarView>[0]['phases']}
      />
      <MeetingsList
        meetings={(meetings ?? []) as Meeting[]}
        isAdmin={isAdmin}
      />
    </div>
  )
}
