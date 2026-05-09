import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOKRs, getDistinctPeriods } from '@/actions/okrs'
import { getTeamMembers } from '@/actions/one-on-ones'
import { PageHeader } from '@/components/layout/PageHeader'
import { OKRBoard } from '@/components/okrs/OKRBoard'
import { PeriodSelector } from '@/components/shared/PeriodSelector'

function currentQuarter() {
  const now = new Date()
  const q = Math.ceil((now.getMonth() + 1) / 3)
  return `${now.getFullYear()}-Q${q}`
}

export default async function OKRsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const period = params.period ?? currentQuarter()

  const [{ okrs }, { periods }, { members }] = await Promise.all([
    getOKRs(period),
    getDistinctPeriods(),
    getTeamMembers(),
  ])

  const allPeriods = [...new Set([...periods, period])].sort().reverse()

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <PageHeader
          title="OKRs"
          description="Objetivos e resultados-chave da equipe."
        />
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Período:</span>
          <PeriodSelector
            value={period}
            options={allPeriods.map((p) => ({ value: p, label: p }))}
          />
        </div>
      </div>
      <OKRBoard okrs={okrs} periods={periods} members={members} currentPeriod={period} />
    </div>
  )
}
