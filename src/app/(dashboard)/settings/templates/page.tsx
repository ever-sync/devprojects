import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/PageHeader'
import { TemplateManagement } from '@/components/projects/TemplateManagement'

export default async function TemplatesSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  // Fetch templates with items
  const { data: templates } = await supabase
    .from('phase_templates')
    .select('*, phase_template_items(*)')
    .order('name')
  const normalizedTemplates: Array<{
    id: string
    name: string
    description: string | null
    project_type: 'saas' | 'automation' | 'ai_agent' | null
    phase_template_items: Array<{ id?: string; name: string }>
  }> = (templates ?? []).map((template) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    project_type:
      template.project_type === 'saas' ||
      template.project_type === 'automation' ||
      template.project_type === 'ai_agent'
        ? template.project_type
        : null,
    phase_template_items: (template.phase_template_items ?? []).map((item) => ({
      id: item.id,
      name: item.name,
    })),
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Templates de Projetos"
        description="Gerencie as fases padrão para novos projetos"
        breadcrumb={[
          { label: 'Configurações', href: '/settings' },
          { label: 'Templates' },
        ]}
      />

      <TemplateManagement initialTemplates={normalizedTemplates} />
    </div>
  )
}
