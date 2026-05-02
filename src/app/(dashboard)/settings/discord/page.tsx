import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/PageHeader'
import { DiscordIntegrationPanel } from '@/components/settings/DiscordIntegrationPanel'

export default async function DiscordSettingsPage() {
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
    .eq('service_type', 'discord')
    .limit(1)
    .maybeSingle()

  const credentials = (integration?.credentials as {
    webhook_url?: string
    channel_name?: string
  } | null) ?? null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Discord"
        description="Configuração de notificações no Discord via webhook."
        breadcrumb={[
          { label: 'Configuracoes', href: '/settings' },
          { label: 'Discord' },
        ]}
      />
      <div className="max-w-2xl">
        <DiscordIntegrationPanel
          connected={Boolean(integration?.is_active)}
          webhookUrl={credentials?.webhook_url ?? null}
          channelName={credentials?.channel_name ?? null}
        />
      </div>
    </div>
  )
}
