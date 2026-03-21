import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/PageHeader'
import { ProjectCard } from '@/components/dashboard/ProjectCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FolderKanban, Plus, Users, Bell, LayoutDashboard, Pencil } from 'lucide-react'
import Link from 'next/link'
import type { Project, NotificationSettings } from '@/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ClientNotificationSettings } from '@/components/clients/ClientNotificationSettings'
import { ClientWorkspaceMembersPanel } from '@/components/clients/ClientWorkspaceMembersPanel'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ClientDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  if (!client) notFound()

  const { data: projects } = await supabase
    .from('projects')
    .select('*, clients(name)')
    .eq('client_id', id)
    .order('updated_at', { ascending: false })

  const { data: clientUsers } = await supabase
    .from('workspace_members')
    .select('id, role, profiles!workspace_members_user_id_fkey(id, full_name, email, avatar_url, role)')
    .eq('workspace_id', client.workspace_id)

  const { data: auditLogs } = await supabase
    .from('audit_logs')
    .select('id, action, metadata, created_at, actor:profiles!audit_logs_actor_user_id_fkey(full_name)')
    .eq('workspace_id', client.workspace_id)
    .order('created_at', { ascending: false })
    .limit(8)

  const initialSettings = (client.notification_settings as unknown as NotificationSettings) || {
    delivery_date_email: true,
    delivery_date_whatsapp: false,
    status_change_email: true,
    status_change_whatsapp: false
  }
  const visibleClientUsers = (clientUsers ?? []).filter((cu) => {
    const profile = (cu as { profiles: { role: string } | null }).profiles
    return profile?.role === 'client'
  })

  return (
    <div>
      <PageHeader
        title={client.name}
        description={client.industry ?? undefined}
        breadcrumb={[{ label: 'Clientes', href: '/clients' }, { label: client.name }]}
        action={
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/clients/${id}/edit`}>
                <Pencil className="w-4 h-4 mr-1" />
                Editar Perfil
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/projects/new?client=${id}`}>
                <Plus className="w-4 h-4 mr-1" />
                Novo Projeto
              </Link>
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notificações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Projetos */}
            <div className="lg:col-span-2">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Projetos ({projects?.length ?? 0})
              </h3>
              {(projects ?? []).length === 0 ? (
                <EmptyState
                  icon={<FolderKanban className="w-10 h-10" />}
                  title="Nenhum projeto"
                  description="Crie o primeiro projeto para este cliente."
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(projects ?? []).map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project as Project & { clients?: { name: string } | null }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Usuários do cliente */}
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Usuários ({visibleClientUsers.length})
                </h3>
                <Button asChild size="sm" variant="outline">
                  <Link href="/team">
                    <Users className="w-3.5 h-3.5 mr-1" />
                    Convidar
                  </Link>
                </Button>
              </div>

              {visibleClientUsers.length === 0 ? (
                <EmptyState
                  title="Nenhum usuário"
                  description="Convide o cliente via página de Equipe."
                />
              ) : (
                <ClientWorkspaceMembersPanel
                  clientId={id}
                  members={visibleClientUsers
                    .map((cu) => {
                      const profile = (cu as {
                        role: 'owner' | 'admin' | 'member'
                        profiles: {
                          id: string
                          full_name: string
                          email: string
                          avatar_url: string | null
                          role: string
                        } | null
                      }).profiles

                      if (!profile) return null

                      return {
                        id: cu.id,
                        role: (cu as { role: 'owner' | 'admin' | 'member' }).role,
                        profile,
                      }
                    })
                    .filter((member): member is {
                      id: string
                      role: 'owner' | 'admin' | 'member'
                      profile: {
                        id: string
                        full_name: string
                        email: string
                        avatar_url: string | null
                        role: string
                      }
                    } => Boolean(member))}
                />
              )}

              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Auditoria recente</h3>
                  <Badge variant="outline">Workspace</Badge>
                </div>

                {(auditLogs ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum evento auditavel registrado ainda.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {(auditLogs ?? []).map((log) => {
                      const actor = (log as { actor: { full_name: string } | null }).actor
                      return (
                        <div key={log.id} className="rounded-lg border border-border/70 bg-background/60 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-foreground">{log.action}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(log.created_at).toLocaleString('pt-BR')}
                            </p>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {actor?.full_name ?? 'Sistema'}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <div className="max-w-3xl">
            <ClientNotificationSettings 
              clientId={id} 
              initialSettings={initialSettings} 
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
