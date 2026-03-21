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

      <TemplateManagement initialTemplates={templates || []} />
    </div>
  )
}
