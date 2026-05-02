import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/PageHeader'
import { MFASetup } from '@/components/settings/MFASetup'

export default async function SecuritySettingsPage() {
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

  if (profile?.role !== 'admin') redirect('/settings')

  // Verificar fatores MFA ativos
  const { data: factors } = await supabase.auth.mfa.listFactors()
  const totpFactor = factors?.totp?.find((f) => f.status === 'verified') ?? null
  const hasMFA = !!totpFactor

  return (
    <div className="space-y-6">
      <PageHeader
        title="Segurança"
        description="Configure autenticação de dois fatores para proteger sua conta de administrador."
      />
      <MFASetup hasMFA={hasMFA} factorId={totpFactor?.id ?? null} />
    </div>
  )
}
