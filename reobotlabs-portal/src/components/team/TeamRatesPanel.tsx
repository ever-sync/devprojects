'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { updateProfileRates } from '@/actions/margin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface TeamRatesPanelProps {
  profiles: Array<{
    id: string
    full_name: string
    email: string
    role: string
    hour_cost: number | null
    bill_rate: number | null
  }>
}

export function TeamRatesPanel({ profiles }: TeamRatesPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [rates, setRates] = useState<Record<string, { hour_cost: string; bill_rate: string }>>(
    Object.fromEntries(
      profiles.map((profile) => [
        profile.id,
        {
          hour_cost: profile.hour_cost?.toString() ?? '',
          bill_rate: profile.bill_rate?.toString() ?? '',
        },
      ]),
    ),
  )

  return (
    <div className="space-y-2">
      {profiles.map((profile) => (
        <div
          key={profile.id}
          className="grid items-center gap-3 rounded-lg border border-border bg-card p-3 md:grid-cols-[1fr_140px_140px_auto]"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{profile.full_name}</p>
            <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
          </div>
          <Input
            type="number"
            step="0.01"
            placeholder="Custo/h"
            value={rates[profile.id]?.hour_cost ?? ''}
            onChange={(e) => setRates((prev) => ({
              ...prev,
              [profile.id]: { ...prev[profile.id], hour_cost: e.target.value },
            }))}
            disabled={isPending}
          />
          <Input
            type="number"
            step="0.01"
            placeholder="Bill rate"
            value={rates[profile.id]?.bill_rate ?? ''}
            onChange={(e) => setRates((prev) => ({
              ...prev,
              [profile.id]: { ...prev[profile.id], bill_rate: e.target.value },
            }))}
            disabled={isPending}
          />
          <Button
            size="sm"
            disabled={isPending}
            onClick={() => startTransition(async () => {
              const result = await updateProfileRates(
                profile.id,
                Number(rates[profile.id]?.hour_cost || 0),
                Number(rates[profile.id]?.bill_rate || 0),
              )
              if (result.error) {
                toast.error(result.error)
                return
              }
              toast.success('Rates atualizados')
            })}
          >
            Salvar
          </Button>
        </div>
      ))}
    </div>
  )
}
