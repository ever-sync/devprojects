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

  return (
    <div>
      <PageHeader
        title="Novo Projeto"
        breadcrumb={[{ label: 'Projetos', href: '/projects' }, { label: 'Novo' }]}
      />
      <ProjectForm 
        clients={clientsRes.data ?? []} 
        templates={templatesRes.data ?? []}
        defaultClientId={defaultClientId} 
      />
    </div>
  )
}
