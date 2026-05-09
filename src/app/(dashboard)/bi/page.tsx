import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getBIDashboard } from '@/actions/bi'
import { PageHeader } from '@/components/layout/PageHeader'
import { BIDashboard } from '@/components/bi/BIDashboard'
import { PeriodSelector } from '@/components/shared/PeriodSelector'

const MONTH_OPTIONS = [3, 6, 12, 24].map((m) => ({
  value: String(m),
  label: `Últimos ${m} meses`,
}))

export default async function BIPage({
  searchParams,
}: {
  searchParams: Promise<{ months?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const params = await searchParams
  const months = Math.min(24, Math.max(1, parseInt(params.months ?? '6')))
  const { data, error } = await getBIDashboard(months)

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <PageHeader
          title="Business Intelligence"
          description="Métricas consolidadas de negócio, equipe e projetos."
        />
        <PeriodSelector
          value={String(months)}
          options={MONTH_OPTIONS}
          paramName="months"
        />
      </div>
      {error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : (
        <BIDashboard data={data!} months={months} />
      )}
    </div>
  )
}
