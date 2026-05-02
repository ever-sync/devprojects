import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProjectTabs } from '@/components/projects/ProjectTabs'
import { PageHeader } from '@/components/layout/PageHeader'
import { N8NWorkflowsPanel } from '@/components/projects/N8NWorkflowsPanel'

interface Props {
  params: Promise<{ id: string }>
}

export default async function N8NWorkflowsPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const db = supabase as any
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

  const [{ data: snapshots }, { data: executionLogs }] = await Promise.all([
    db
      .from('n8n_workflow_snapshots')
      .select(`
        *,
        creator:created_by(id, full_name, email),
        promoter:promoted_by(id, full_name, email)
      `)
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
    db
      .from('n8n_execution_logs')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  return (
    <div>
      <PageHeader
        title={project.name}
        description={(project.clients as { name: string } | null)?.name}
        breadcrumb={[
          { label: 'Projetos', href: '/projects' },
          { label: project.name, href: `/projects/${id}` },
          { label: 'Workflows N8N' },
        ]}
      />
      <ProjectTabs projectId={id} isAdmin projectType={project.type} />
      <N8NWorkflowsPanel
        projectId={id}
        snapshots={snapshots ?? []}
        executionLogs={executionLogs ?? []}
      />
    </div>
  )
}
