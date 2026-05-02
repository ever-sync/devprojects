import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/PageHeader'
import { AuditLogTable } from '@/components/settings/AuditLogTable'

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string; entity?: string }>
}) {
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

  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1'))
  const pageSize = 50
  const offset = (page - 1) * pageSize

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('audit_logs')
    .select('*, actor:profiles!audit_logs_actor_user_id_fkey(full_name, email, avatar_url)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (params.action) query = query.eq('action', params.action)
  if (params.entity) query = query.eq('entity_type', params.entity)

  const { data: logs, count } = await query

  return (
    <div className="space-y-6">
      <PageHeader
        title="Logs de Auditoria"
        description="Registro de todas as ações realizadas no sistema."
      />
      <AuditLogTable
        logs={logs ?? []}
        total={count ?? 0}
        page={page}
        pageSize={pageSize}
        filters={{ action: params.action, entity: params.entity }}
      />
    </div>
  )
}
