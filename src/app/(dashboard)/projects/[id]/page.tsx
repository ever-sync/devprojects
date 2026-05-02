import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProjectOverview } from '@/components/projects/ProjectOverview'
import { PageHeader } from '@/components/layout/PageHeader'
import { ProjectTabs } from '@/components/projects/ProjectTabs'
import { Button } from '@/components/ui/button'
import { workspaceHasFeature } from '@/lib/workspace-features'
import Link from 'next/link'
import { Settings } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProjectPage({ params }: Props) {
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
    .select('*, clients(name), workspace_id')
    .eq('id', id)
    .single()

  if (!project) notFound()

  const isAdmin = profile?.role === 'admin'
  const [{ data: approvals }, { data: timeEntries }] = await Promise.all([
    supabase.from('approvals').select('status').eq('project_id', id),
    supabase.from('time_entries').select('hours').eq('project_id', id),
  ])

  const overviewMetrics = {
    pendingApprovals: (approvals ?? []).filter((approval) => approval.status === 'pending').length,
    loggedHours: (timeEntries ?? []).reduce((total, entry) => total + Number(entry.hours ?? 0), 0),
  }
  const publicPortalFeature = isAdmin
    ? await workspaceHasFeature(supabase, project.workspace_id, 'public_portal')
    : { allowed: false, error: null }

  return (
    <div>
      <PageHeader
        title={project.name}
        description={(project.clients as { name: string } | null)?.name}
        breadcrumb={[
          { label: 'Projetos', href: '/projects' },
          { label: project.name },
        ]}
        action={
          isAdmin ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/projects/${id}/edit`}>
                <Settings className="w-4 h-4 mr-1" />
                Editar
              </Link>
            </Button>
          ) : undefined
        }
      />

      <ProjectTabs projectId={id} isAdmin={isAdmin} projectType={project.type} />

      <ProjectOverview
        project={project}
        isAdmin={isAdmin}
        metrics={overviewMetrics}
        publicPortalEnabledForPlan={publicPortalFeature.allowed}
      />
    </div>
  )
}
