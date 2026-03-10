import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/PageHeader'
import { RoleBadge } from '@/components/shared/RoleBadge'
import { ProfileForm } from '@/components/settings/ProfileForm'
import { NotificationForm } from '@/components/settings/NotificationForm'
import { getClientNotificationSettings } from '@/actions/profile'
import { Layout, ChevronRight, CreditCard } from 'lucide-react'
import type { Profile, UserRole, NotificationSettings } from '@/types'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const isClient = profile.role === 'client'
  const notifData = isClient ? await getClientNotificationSettings() : null

  return (
    <div>
      <PageHeader title="Configurações" description="Seu perfil e preferências" />

      <div className="max-w-lg space-y-6">
        {/* Role badge — read only */}
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <RoleBadge role={profile.role as UserRole} />
          <span className="text-xs text-muted-foreground">{user.email}</span>
        </div>

        <ProfileForm profile={profile as Profile} />

        {/* Notification preferences — for client users only */}
        {isClient && notifData?.clientId && notifData.settings && (
          <div className="pt-6 border-t border-border">
            <NotificationForm
              clientId={notifData.clientId}
              initialSettings={notifData.settings as NotificationSettings}
            />
          </div>
        )}

        {profile.role === 'admin' && (
          <div className="pt-6 border-t border-border">
            <h3 className="text-sm font-medium mb-4">Administração</h3>
            <div className="grid grid-cols-1 gap-2">
              <a
                href="/settings/billing"
                className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Billing de Workspaces</p>
                    <p className="text-xs text-muted-foreground">Planos, status e capacidade comercial</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </a>
              <a
                href="/settings/templates"
                className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <Layout className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Templates de Projetos</p>
                    <p className="text-xs text-muted-foreground">Gerenciar fases padrão</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
