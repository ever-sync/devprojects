import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/PageHeader'
import { ProjectTabs } from '@/components/projects/ProjectTabs'
import { ScopeManagement } from '@/components/projects/ScopeManagement'
import { getProjectScopeData } from '@/actions/scope'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProjectScopePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: project }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('projects').select('id, name').eq('id', id).single(),
  ])

  if (!project) notFound()

  const scopeData = await getProjectScopeData(id)
  if (scopeData.error || !scopeData.project) notFound()

  const isAdmin = profile?.role === 'admin'
  if (!isAdmin) redirect(`/projects/${id}`)

  return (
    <div>
      <PageHeader
        title="Escopo e mudancas"
        breadcrumb={[
          { label: project.name, href: `/projects/${id}` },
          { label: 'Escopo' },
        ]}
      />

      <ProjectTabs projectId={id} isAdmin={isAdmin} />

      <ScopeManagement
        projectId={id}
        project={scopeData.project}
        scopeVersions={scopeData.scopeVersions}
        changeRequests={scopeData.changeRequests}
        isAdmin={isAdmin}
      />
    </div>
  )
}
