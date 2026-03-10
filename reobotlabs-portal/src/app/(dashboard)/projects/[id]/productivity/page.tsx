import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProjectMarginData } from '@/actions/margin'
import { PageHeader } from '@/components/layout/PageHeader'
import { ProjectTabs } from '@/components/projects/ProjectTabs'
import { ProductivityReport } from '@/components/projects/ProductivityReport'
import type { TaskWithAssignee } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProductivityPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect(`/projects/${id}`)
  }

  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', id)
    .single()

  if (!project) notFound()

  // Fetch tasks with assignees
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url)')
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  const [{ data: timeEntries }, { data: approvals }, { data: projectMetrics }, marginRes] = await Promise.all([
    supabase.from('time_entries').select('hours, approved_at').eq('project_id', id),
    supabase.from('approvals').select('status').eq('project_id', id),
    supabase
      .from('projects')
      .select('baseline_hours, contract_value, margin_percent')
      .eq('id', id)
      .single(),
    getProjectMarginData(id),
  ])

  return (
    <div>
      <PageHeader
        title="Produtividade"
        breadcrumb={[
          { label: project.name, href: `/projects/${id}` },
          { label: 'Produtividade' },
        ]}
      />

      <ProjectTabs projectId={id} isAdmin={true} />

      <ProductivityReport
        tasks={(tasks ?? []) as unknown as TaskWithAssignee[]}
        metrics={{
          loggedHours: (timeEntries ?? []).reduce((total, entry) => total + Number(entry.hours ?? 0), 0),
          approvedHours: (timeEntries ?? []).reduce(
            (total, entry) => total + (entry.approved_at ? Number(entry.hours ?? 0) : 0),
            0,
          ),
          pendingApprovals: (approvals ?? []).filter((approval) => approval.status === 'pending').length,
          baselineHours: projectMetrics?.baseline_hours ?? null,
          contractValue: projectMetrics?.contract_value ?? null,
          marginPercent: projectMetrics?.margin_percent ?? null,
          internalCost: marginRes.summary?.internalCost ?? 0,
          recognizedRevenue: marginRes.summary?.recognizedRevenue ?? 0,
          grossMargin: marginRes.summary?.grossMargin ?? 0,
          marginPercentReal: marginRes.summary?.marginPercentReal ?? null,
        }}
      />
    </div>
  )
}
