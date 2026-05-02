import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProjectFinanceData } from '@/actions/finance'
import { getProjectMarginData } from '@/actions/margin'
import { PageHeader } from '@/components/layout/PageHeader'
import { FinancePanel } from '@/components/projects/FinancePanel'
import { ProjectTabs } from '@/components/projects/ProjectTabs'
import { EmptyState } from '@/components/shared/EmptyState'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProjectFinancePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: project }, financeData, marginData] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('projects').select('id, name, type, workspace_id').eq('id', id).single(),
    getProjectFinanceData(id),
    getProjectMarginData(id),
  ])

  if (!project) notFound()

  const isAdmin = profile?.role === 'admin'
  if (!isAdmin) redirect(`/projects/${id}`)
  const { data: financeAuditLogs } = await supabase
    .from('audit_logs')
    .select('id, workspace_id, actor_user_id, entity_type, entity_id, action, metadata, created_at, actor:profiles!audit_logs_actor_user_id_fkey(full_name)')
    .eq('workspace_id', project.workspace_id)
    .ilike('action', 'finance.%')
    .order('created_at', { ascending: false })
    .limit(12)

  return (
    <div>
      <PageHeader
        title="Financeiro"
        breadcrumb={[
          { label: project.name, href: `/projects/${id}` },
          { label: 'Financeiro' },
        ]}
      />

      <ProjectTabs projectId={id} isAdmin={isAdmin} projectType={project.type} />

      {financeData.error ? (
        <EmptyState
          title="Financeiro indisponivel"
          description={financeData.error}
        />
      ) : (
        <FinancePanel
          projectId={id}
          contract={financeData.contract}
          milestones={financeData.milestones}
          invoices={financeData.invoices}
          invoiceEvents={financeData.invoiceEvents}
          auditLogs={financeAuditLogs ?? []}
          marginSummary={marginData.summary}
          snapshots={marginData.snapshots}
        />
      )}
    </div>
  )
}
