import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { CommandPalette } from '@/components/shared/CommandPalette'
import { OnboardingBanner } from '@/components/onboarding/OnboardingBanner'
import type { Profile } from '@/types'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const needsOnboarding =
    profile.role === 'client' && !profile.phone && !profile.company

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar role={profile.role as 'admin' | 'client'} profile={profile as Profile} />
      <div className="dashboard-surface bg-background text-foreground flex-1 flex min-w-0 flex-col overflow-hidden">
        <div className="shrink-0">
          <Topbar profile={profile as Profile} notifications={notifications ?? []} />
        </div>
        {needsOnboarding && <OnboardingBanner />}
        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
          {children}
        </main>
      </div>
      <CommandPalette />
    </div>
  )
}
