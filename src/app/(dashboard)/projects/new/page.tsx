import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProjectForm } from '@/components/projects/ProjectForm'
import { PageHeader } from '@/components/layout/PageHeader'

interface Props {
  searchParams: Promise<{ client?: string }>
}

export default async function NewProjectPage({ searchParams }: Props) {
  const { client: defaultClientId } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const [clientsRes, templatesRes] = await Promise.all([
    supabase.from('clients').select('id, name').order('name'),
    supabase.from('phase_templates').select('id, name, project_type').order('name')
  ])
  const normalizedTemplates: Array<{
    id: string
    name: string
    project_type: 'saas' | 'automation' | 'ai_agent' | null
  }> = (templatesRes.data ?? []).map((template) => ({
    id: template.id,
    name: template.name,
    project_type:
      template.project_type === 'saas' ||
      template.project_type === 'automation' ||
      template.project_type === 'ai_agent'
        ? template.project_type
        : null,
  }))

  return (
    <div>
      <PageHeader
        title="Novo Projeto"
        breadcrumb={[{ label: 'Projetos', href: '/projects' }, { label: 'Novo' }]}
      />
      <ProjectForm 
        clients={clientsRes.data ?? []} 
        templates={normalizedTemplates}
        defaultClientId={defaultClientId} 
      />
    </div>
  )
}
