import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/PageHeader'
import { WorkspaceWebhookPanel } from '@/components/settings/WorkspaceWebhookPanel'

export default async function WebhooksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/settings')

  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id, name, slug, n8n_webhook_enabled, n8n_webhook_url, n8n_webhook_secret')
    .order('name')

  return (
    <div>
      <PageHeader
        title="Webhooks"
        description="Configure integracoes outbound por workspace para automacoes no n8n."
        breadcrumb={[
          { label: 'Configuracoes', href: '/settings' },
          { label: 'Webhooks' },
        ]}
      />

      <WorkspaceWebhookPanel workspaces={workspaces ?? []} />
    </div>
  )
}
