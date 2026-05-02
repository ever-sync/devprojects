import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { ClientTaskPanel } from '@/components/kanban/ClientTaskPanel'
import { AddTaskButton } from '@/components/kanban/AddTaskButton'
import { AITaskButton } from '@/components/kanban/AITaskButton'
import { ExportTasksButton } from '@/components/kanban/ExportTasksButton'
import { KanbanPhaseManager } from '@/components/kanban/KanbanPhaseManager'
import { PageHeader } from '@/components/layout/PageHeader'
import { ProjectTabs } from '@/components/projects/ProjectTabs'

interface Props {
  params: Promise<{ id: string }>
}

export default async function TasksPage({ params }: Props) {
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
    .select('id, name, type, client_id')
    .eq('id', id)
    .single()

  if (!project) notFound()

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url)')
    .eq('project_id', id)
    .order('order_index')

  const { data: phases } = await supabase
    .from('project_phases')
    .select('*')
    .eq('project_id', id)
    .order('order_index')

  const isAdmin = profile?.role === 'admin'

  let teamMembers: { id: string; full_name: string }[] = []
  let mentionableUsers: { id: string; full_name: string; role: 'admin' | 'client' }[] = []
  if (isAdmin) {
    const { data: members } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .in('role', ['admin', 'client'])

    const { data: clientUsers } = await supabase
      .from('client_users')
      .select('user_id')
      .eq('client_id', project.client_id)

    const clientUserIds = new Set((clientUsers ?? []).map((item) => item.user_id))
    mentionableUsers = (members ?? []).filter((member) => member.role === 'admin' || clientUserIds.has(member.id)) as typeof mentionableUsers
    teamMembers = mentionableUsers.filter((member) => member.role === 'admin')
      .map((member) => ({ id: member.id, full_name: member.full_name }))
  }

  return (
    <div>
      <PageHeader
        title="Tarefas"
        breadcrumb={[
          { label: project.name, href: `/projects/${id}` },
          { label: 'Tarefas' },
        ]}
        action={
          isAdmin ? (
            <div className="flex items-center gap-2">
              <KanbanPhaseManager
                projectId={id}
                phases={phases ?? []}
              />
              <ExportTasksButton projectId={id} projectName={project.name} />
              <AITaskButton projectId={id} />
              <AddTaskButton projectId={id} />
            </div>
          ) : undefined
        }
      />

      <ProjectTabs projectId={id} isAdmin={isAdmin} projectType={project.type} />

      {isAdmin ? (
        <KanbanBoard
          projectId={id}
          currentUserId={user.id}
          initialTasks={(tasks ?? []) as unknown as Parameters<typeof KanbanBoard>[0]['initialTasks']}
          isAdmin={isAdmin}
          teamMembers={teamMembers}
          phases={(phases ?? []).map((phase) => ({ id: phase.id, name: phase.name }))}
          mentionableUsers={mentionableUsers}
        />
      ) : (
        <ClientTaskPanel
          projectId={id}
          currentUserId={user.id}
          tasks={(tasks ?? []) as Parameters<typeof ClientTaskPanel>[0]['tasks']}
        />
      )}
    </div>
  )
}
