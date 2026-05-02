import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar } from '@/components/shared/Avatar'
import { RoleBadge } from '@/components/shared/RoleBadge'
import { InviteUserForm } from '@/components/team/InviteUserForm'
import { TeamRatesPanel } from '@/components/team/TeamRatesPanel'
import { CapacityPlanningPanel } from '@/components/team/CapacityPlanningPanel'
import { ResourceAllocationBoard } from '@/components/team/ResourceAllocationBoard'
import { Badge } from '@/components/ui/badge'
import type { UserRole } from '@/types'
import { getCapacityPlanningData, getResourceAllocationData } from '@/actions/execution'

interface TeamPageProps {
  searchParams: Promise<{ member?: string; period?: string }>
}

export default async function TeamPage({ searchParams }: TeamPageProps) {
  const params = await searchParams
  const focusedMemberId = params.member ?? null
  const allowedHorizonWeeks = new Set(['2', '4', '8', '12'])
  const horizonWeeks = allowedHorizonWeeks.has(params.period ?? '') ? Number(params.period) : 4
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('role')
    .order('full_name')

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, workspace_id')
    .order('name')

  const { data: workspaceMembers } = await supabase
    .from('workspace_members')
    .select('id, workspace_id, role, profiles!workspace_members_user_id_fkey(id, full_name, email, avatar_url, role)')

  const capacityPlanning = await getCapacityPlanningData(horizonWeeks)
  const resourceAllocation = await getResourceAllocationData()

  const workspaceNames = new Map((clients ?? []).map((client) => [client.workspace_id, client.name]))
  const clientWorkspaceMembers = (workspaceMembers ?? [])
    .filter((member) => {
      const profile = member.profiles as { role: string } | null
      return profile?.role === 'client'
    })
    .map((member) => ({
      id: member.id,
      workspaceRole: member.role,
      clientName: workspaceNames.get(member.workspace_id) ?? 'Workspace sem cliente',
      profile: member.profiles as { id: string; full_name: string; email: string; avatar_url: string | null; role: string } | null,
    }))
    .filter((member) => member.profile)

  return (
    <div>
      <PageHeader
        title="Equipe e usuarios"
        description="Gerencie equipe interna, membros de workspace e parametros de custo."
      />

      {focusedMemberId && (
        <div className="mb-4 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Filtro ativo por membro. <Link className="underline" href="/team">Limpar foco</Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div>
          <h3 className="mb-4 text-sm font-semibold text-foreground">Convidar membro do cliente</h3>
          <div className="rounded-xl border border-border bg-card p-5">
            <InviteUserForm clients={clients ?? []} />
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Equipe interna ({(profiles ?? []).filter((person) => person.role === 'admin').length})
          </h3>
          <div className="space-y-2">
            {(profiles ?? [])
              .filter((person) => person.role === 'admin')
              .map((person) => (
              <div
                key={person.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
              >
                <Avatar name={person.full_name} avatarUrl={person.avatar_url} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{person.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{person.email}</p>
                </div>
                <RoleBadge role={person.role as UserRole} />
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Membros de workspace ({clientWorkspaceMembers.length})
          </h3>
          <div className="space-y-2">
            {clientWorkspaceMembers.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
                Nenhum membro cliente vinculado a workspace.
              </div>
            ) : (
              clientWorkspaceMembers.map((member) => (
                <div
                  key={member.id}
                  className="rounded-lg border border-border bg-card p-3"
                >
                  <div className="flex items-start gap-3">
                    <Avatar
                      name={member.profile?.full_name ?? 'Usuario'}
                      avatarUrl={member.profile?.avatar_url ?? null}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-foreground">
                          {member.profile?.full_name}
                        </p>
                        <RoleBadge role="client" />
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {member.profile?.email}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="outline">{member.clientName}</Badge>
                        <Badge variant="secondary" className="capitalize">
                          {member.workspaceRole}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Custo interno e bill rate</h3>
        <TeamRatesPanel profiles={(profiles ?? []).filter((person) => person.role === 'admin')} />
      </div>

      <div className="mt-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground">
            Capacity planning ({horizonWeeks} semanas)
          </h3>
          <div className="flex flex-wrap gap-2">
            {[2, 4, 8, 12].map((weeks) => {
              const isActive = weeks === horizonWeeks
              const periodHref = focusedMemberId
                ? `/team?period=${weeks}&member=${focusedMemberId}`
                : `/team?period=${weeks}`
              return (
                <Link
                  key={weeks}
                  href={periodHref}
                  className={`rounded-md border px-3 py-1 text-xs transition ${
                    isActive
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {weeks} sem
                </Link>
              )
            })}
          </div>
        </div>
        {capacityPlanning.error || !capacityPlanning.data ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
            Nao foi possivel carregar capacity planning: {capacityPlanning.error ?? 'erro desconhecido'}
          </div>
        ) : (
          <CapacityPlanningPanel {...capacityPlanning.data} focusedMemberId={focusedMemberId} />
        )}
      </div>

      <div className="mt-8">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Alocacao visual de recursos</h3>
        {resourceAllocation.error || !resourceAllocation.data ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
            Nao foi possivel carregar quadro de alocacao: {resourceAllocation.error ?? 'erro desconhecido'}
          </div>
        ) : (
          <ResourceAllocationBoard
            teamMembers={resourceAllocation.data.teamMembers}
            tasks={resourceAllocation.data.tasks}
            focusedMemberId={focusedMemberId}
          />
        )}
      </div>
    </div>
  )
}
