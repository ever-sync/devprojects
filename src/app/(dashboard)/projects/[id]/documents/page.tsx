import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DocumentVault } from '@/components/documents/DocumentVault'
import { PageHeader } from '@/components/layout/PageHeader'
import { ProjectTabs } from '@/components/projects/ProjectTabs'

interface Props {
  params: Promise<{ id: string }>
}

export default async function DocumentsPage({ params }: Props) {
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
    .select('id, name, client_id')
    .eq('id', id)
    .single()

  if (!project) notFound()

  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  const isAdmin = profile?.role === 'admin'

  return (
    <div>
      <PageHeader
        title="Documentos"
        breadcrumb={[
          { label: project.name, href: `/projects/${id}` },
          { label: 'Documentos' },
        ]}
      />

      <ProjectTabs projectId={id} isAdmin={isAdmin} />

      <DocumentVault
        documents={documents ?? []}
        projectId={id}
        clientId={project.client_id}
        isAdmin={isAdmin}
      />
    </div>
  )
}
