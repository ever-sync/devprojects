import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProjectApprovals } from '@/actions/approvals'
import { PageHeader } from '@/components/layout/PageHeader'
import { ProjectTabs } from '@/components/projects/ProjectTabs'
import { ApprovalsPanel } from '@/components/projects/ApprovalsPanel'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProjectApprovalsPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: project }, approvalsRes] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('projects').select('id, name').eq('id', id).single(),
    getProjectApprovals(id),
  ])

  if (!project) notFound()

  const isAdmin = profile?.role === 'admin'

  return (
    <div>
      <PageHeader
        title="Aprovacoes"
        breadcrumb={[
          { label: project.name, href: `/projects/${id}` },
          { label: 'Aprovacoes' },
        ]}
      />

      <ProjectTabs projectId={id} isAdmin={isAdmin} />

      <ApprovalsPanel
        projectId={id}
        approvals={approvalsRes.data ?? []}
        isAdmin={isAdmin}
      />
    </div>
  )
}
