'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { updateWorkspaceSubscription } from '@/actions/workspace-billing'
import type { Plan, SubscriptionStatus } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

interface WorkspaceBillingPanelProps {
  plans: Plan[]
  workspaces: Array<{
    id: string
    name: string
    slug: string
    projectCount: number
    memberCount: number
    subscription: {
      id: string | null
      plan_id: string
      status: SubscriptionStatus
      seats: number
      current_period_end: string | null
      cancel_at_period_end: boolean
    } | null
  }>
}

type WorkspaceFormState = {
  planId: string
  status: SubscriptionStatus
  seats: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
}

export function WorkspaceBillingPanel({ plans, workspaces }: WorkspaceBillingPanelProps) {
  const [isPending, startTransition] = useTransition()
  const defaultPlanId = plans[0]?.id ?? ''
  const [forms, setForms] = useState<Record<string, WorkspaceFormState>>(
    Object.fromEntries(
      workspaces.map((workspace) => [
        workspace.id,
        {
          planId: workspace.subscription?.plan_id ?? defaultPlanId,
          status: workspace.subscription?.status ?? 'active',
          seats: String(workspace.subscription?.seats ?? 5),
          currentPeriodEnd: workspace.subscription?.current_period_end ?? '',
          cancelAtPeriodEnd: workspace.subscription?.cancel_at_period_end ?? false,
        },
      ]),
    ),
  )

  return (
    <div className="grid gap-4">
      {workspaces.map((workspace) => {
        const form = forms[workspace.id]
        const currentPlan = plans.find((plan) => plan.id === form.planId)

        return (
          <Card key={workspace.id}>
            <CardHeader>
              <CardTitle>{workspace.name}</CardTitle>
              <CardDescription>{workspace.slug}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
                    Uso atual
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    {workspace.projectCount} projeto(s) e {workspace.memberCount} membro(s)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Plano</Label>
                  <Select
                    value={form.planId}
                    onValueChange={(value) =>
                      setForms((prev) => ({
                        ...prev,
                        [workspace.id]: { ...prev[workspace.id], planId: value },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um plano" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {currentPlan && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        R$ {currentPlan.price_monthly_brl}/mes
                        {' · '}
                        {currentPlan.project_limit ?? '∞'} projetos
                        {' · '}
                        {currentPlan.member_limit ?? '∞'} membros
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Features:
                        {' '}
                        {currentPlan.key === 'starter'
                          ? 'operacao basica'
                          : currentPlan.key === 'growth'
                            ? 'portal publico e financeiro'
                            : 'portal publico, financeiro e analytics avancado'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value) =>
                      setForms((prev) => ({
                        ...prev,
                        [workspace.id]: {
                          ...prev[workspace.id],
                          status: value as SubscriptionStatus,
                        },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trialing">Trial</SelectItem>
                      <SelectItem value="active">Ativa</SelectItem>
                      <SelectItem value="past_due">Em atraso</SelectItem>
                      <SelectItem value="canceled">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Assentos</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.seats}
                    onChange={(event) =>
                      setForms((prev) => ({
                        ...prev,
                        [workspace.id]: { ...prev[workspace.id], seats: event.target.value },
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Fim do periodo atual</Label>
                  <Input
                    type="date"
                    value={form.currentPeriodEnd}
                    onChange={(event) =>
                      setForms((prev) => ({
                        ...prev,
                        [workspace.id]: {
                          ...prev[workspace.id],
                          currentPeriodEnd: event.target.value,
                        },
                      }))
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Cancelar ao fim do periodo</p>
                  <p className="text-xs text-muted-foreground">
                    Mantem o workspace ativo ate o fechamento do ciclo atual.
                  </p>
                </div>
                <Switch
                  checked={form.cancelAtPeriodEnd}
                  onCheckedChange={(checked) =>
                    setForms((prev) => ({
                      ...prev,
                      [workspace.id]: {
                        ...prev[workspace.id],
                        cancelAtPeriodEnd: checked,
                      },
                    }))
                  }
                />
              </div>

              <div className="flex justify-end">
                <Button
                  disabled={isPending || !form.planId}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await updateWorkspaceSubscription({
                        workspaceId: workspace.id,
                        planId: form.planId,
                        status: form.status,
                        seats: Number(form.seats || 0),
                        currentPeriodEnd: form.currentPeriodEnd || null,
                        cancelAtPeriodEnd: form.cancelAtPeriodEnd,
                      })

                      if (result.error) {
                        toast.error(result.error)
                        return
                      }

                      toast.success('Assinatura atualizada')
                    })
                  }
                >
                  Salvar assinatura
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
