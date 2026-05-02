import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/PageHeader'
import { DelegationDashboard } from '@/components/dashboard/DelegationDashboard'

export default async function DelegationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  // Buscar todas as tarefas com assignee de projetos ativos
  const { data: tasks } = await supabase
    .from('tasks')
    .select(`
      id,
      title,
      status,
      priority,
      updated_at,
      project_id,
      projects!inner(name, status),
      assignee:profiles!tasks_assignee_id_fkey(id, full_name, email)
    `)
    .eq('projects.status', 'active')
    .neq('status', 'done')
    .order('updated_at', { ascending: true })

  const normalizedTasks = (tasks ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    updated_at: t.updated_at,
    project_id: t.project_id,
    project_name: (t.projects as { name: string } | null)?.name ?? '',
    assignee: t.assignee as { id: string; full_name: string; email: string } | null,
  }))

  return (
    <div>
      <PageHeader
        title="Delegações"
        description="Visão consolidada de tarefas delegadas por responsável"
        breadcrumb={[{ label: 'Delegações' }]}
      />
      <DelegationDashboard tasks={normalizedTasks} />
    </div>
  )
}
