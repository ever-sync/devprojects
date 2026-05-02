import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/PageHeader'
import { WhatsAppIntegrationPanel } from '@/components/settings/WhatsAppIntegrationPanel'

export default async function WhatsAppSettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/settings')

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .in('role', ['owner', 'admin'])
    .limit(1)
    .single()

  if (!membership?.workspace_id) redirect('/settings?error=no_workspace')

  const { data: integration } = await supabase
    .from('external_integrations')
    .select('credentials, is_active')
    .eq('workspace_id', membership.workspace_id)
    .eq('service_type', 'whatsapp')
    .limit(1)
    .maybeSingle()

  const credentials = (integration?.credentials as {
    base_url?: string
    instance?: string
    default_number?: string
  } | null) ?? null

  return (
    <div className="space-y-6">
      <PageHeader
        title="WhatsApp Business"
        description="Configuracao de notificacoes reais via Evolution API."
        breadcrumb={[
          { label: 'Configuracoes', href: '/settings' },
          { label: 'WhatsApp' },
        ]}
      />
      <div className="max-w-2xl">
        <WhatsAppIntegrationPanel
          connected={Boolean(integration?.is_active)}
          baseUrl={credentials?.base_url ?? null}
          instance={credentials?.instance ?? null}
          defaultNumber={credentials?.default_number ?? null}
        />
      </div>
    </div>
  )
}
