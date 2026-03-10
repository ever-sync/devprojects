import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getClientNotificationSettings } from '@/actions/profile'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'
import type { Profile, NotificationSettings } from '@/types'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  if (profile.role !== 'client') redirect('/dashboard')

  const notifData = await getClientNotificationSettings()

  const defaultSettings: NotificationSettings = {
    delivery_date_email: true,
    delivery_date_whatsapp: false,
    status_change_email: true,
    status_change_whatsapp: false,
  }

  return (
    <OnboardingWizard
      profile={profile as Profile}
      clientId={notifData.clientId ?? null}
      initialSettings={(notifData.settings ?? defaultSettings) as NotificationSettings}
    />
  )
}
