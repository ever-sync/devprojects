import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/PageHeader'
import { SlackIntegrationPanel } from '@/components/settings/SlackIntegrationPanel'

export default async function SlackSettingsPage() {
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
    .eq('service_type', 'slack')
    .limit(1)
    .maybeSingle()

  const credentials = (integration?.credentials as {
    team_name?: string
    channel_id?: string
    channel_name?: string
  } | null) ?? null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Slack"
        description="Configuração de notificações no Slack via OAuth."
        breadcrumb={[
          { label: 'Configuracoes', href: '/settings' },
          { label: 'Slack' },
        ]}
      />
      <div className="max-w-2xl">
        <SlackIntegrationPanel
          connected={Boolean(integration?.is_active)}
          teamName={credentials?.team_name ?? null}
          defaultChannelId={credentials?.channel_id ?? null}
          defaultChannelName={credentials?.channel_name ?? null}
        />
      </div>
    </div>
  )
}
