import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProjectTabs } from '@/components/projects/ProjectTabs'
import { PageHeader } from '@/components/layout/PageHeader'
import { AIScriptsPanel } from '@/components/projects/AIScriptsPanel'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AIScriptsPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
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

  const { data: scripts } = await supabase
    .from('ai_scripts')
    .select(`
      *,
      creator:created_by(id, full_name, email),
      promoter:promoted_by(id, full_name, email)
    `)
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <PageHeader
        title={project.name}
        description={(project.clients as { name: string } | null)?.name}
        breadcrumb={[
          { label: 'Projetos', href: '/projects' },
          { label: project.name, href: `/projects/${id}` },
          { label: 'Scripts de IA' },
        ]}
      />
      <ProjectTabs projectId={id} isAdmin projectType={project.type} />
      <AIScriptsPanel projectId={id} scripts={scripts ?? []} />
    </div>
  )
}
