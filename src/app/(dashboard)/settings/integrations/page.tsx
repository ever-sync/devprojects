import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/PageHeader'
import { GitIntegrationsManager } from '@/components/settings/GitIntegrationsManager'

export default async function IntegrationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/settings')
  }

  // Try to get workspace, but don't block if not found
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .single()

  // Fallback: get workspace from any project the user has access to
  let workspaceId = membership?.workspace_id
  if (!workspaceId) {
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .limit(1)
      .single()
    workspaceId = workspace?.id
  }

  if (!workspaceId) {
    return (
      <div>
        <PageHeader
          title="Integracoes Git"
          description="Conecte seus repositorios GitHub, GitLab ou Bitbucket"
        />
        <p className="text-muted-foreground mt-4">Nenhum workspace encontrado. Crie um projeto primeiro.</p>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Integracoes Git"
        description="Conecte seus repositorios GitHub, GitLab ou Bitbucket"
      />
      <GitIntegrationsManager workspaceId={workspaceId} />
    </div>
  )
}
