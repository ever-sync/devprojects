import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/PageHeader'
import { WorkspaceBillingPanel } from '@/components/settings/WorkspaceBillingPanel'
import type { Plan, Subscription, Workspace } from '@/types'

type WorkspaceWithSubscription = Pick<Workspace, 'id' | 'name' | 'slug'> & {
  subscriptions?: Array<Pick<Subscription, 'id' | 'plan_id' | 'status' | 'seats' | 'current_period_end' | 'cancel_at_period_end'>>
}

export default async function BillingSettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const [{ data: plans }, { data: workspaces }] = await Promise.all([
    supabase.from('plans').select('*').order('price_monthly_brl'),
    supabase.from('workspaces').select('id, name, slug, subscriptions(id, plan_id, status, seats, current_period_end, cancel_at_period_end)').order('name'),
  ])

  const [projectsByWorkspace, membersByWorkspace] = await Promise.all([
    supabase.from('projects').select('workspace_id'),
    supabase.from('workspace_members').select('workspace_id'),
  ])

  const projectCounts = new Map<string, number>()
  for (const project of projectsByWorkspace.data ?? []) {
    projectCounts.set(project.workspace_id, (projectCounts.get(project.workspace_id) ?? 0) + 1)
  }

  const memberCounts = new Map<string, number>()
  for (const member of membersByWorkspace.data ?? []) {
    memberCounts.set(member.workspace_id, (memberCounts.get(member.workspace_id) ?? 0) + 1)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing de Workspaces"
        description="Gerencie plano, status e capacidade comercial de cada workspace."
        breadcrumb={[
          { label: 'Configuracoes', href: '/settings' },
          { label: 'Billing' },
        ]}
      />

      <WorkspaceBillingPanel
        plans={(plans ?? []) as Plan[]}
        workspaces={((workspaces ?? []) as WorkspaceWithSubscription[]).map((workspace) => ({
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          projectCount: projectCounts.get(workspace.id) ?? 0,
          memberCount: memberCounts.get(workspace.id) ?? 0,
          subscription: workspace.subscriptions?.[0] ?? null,
        }))}
      />
    </div>
  )
}
