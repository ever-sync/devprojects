'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createApprovalRequest, decideApproval } from '@/actions/approvals'
import type { Approval, ApprovalItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface ApprovalsPanelProps {
  projectId: string
  approvals: Array<Approval & { items: ApprovalItem[] }>
  isAdmin: boolean
}

function approvalKindLabel(kind: 'scope' | 'timeline' | 'delivery') {
  if (kind === 'scope') return 'Escopo'
  if (kind === 'timeline') return 'Cronograma'
  return 'Entrega'
}

function approvalStatusLabel(status: string) {
  if (status === 'pending') return 'Pendente'
  if (status === 'approved') return 'Aprovada'
  if (status === 'revision_requested') return 'Revisao solicitada'
  return status.replace('_', ' ')
}

export function ApprovalsPanel({ projectId, approvals, isAdmin }: ApprovalsPanelProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    approval_kind: 'delivery' as 'scope' | 'timeline' | 'delivery',
    title: '',
    description: '',
    due_date: '',
    sla_due_at: '',
    itemLabel: '',
    itemDetails: '',
  })

  function done(message: string) {
    toast.success(message)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {isAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle>Nova solicitacao de aprovacao</CardTitle>
            <CardDescription>
              Formalize aceite de escopo, cronograma ou entrega com prazo e itens claros.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Select
                value={form.approval_kind}
                onValueChange={(value: 'scope' | 'timeline' | 'delivery') =>
                  setForm((prev) => ({ ...prev, approval_kind: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de aprovacao" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scope">Escopo</SelectItem>
                  <SelectItem value="timeline">Cronograma</SelectItem>
                  <SelectItem value="delivery">Entrega</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Titulo"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                disabled={isPending}
              />
            </div>

            <Textarea
              placeholder="Contexto da aprovacao"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              disabled={isPending}
            />

            <div className="grid gap-3 md:grid-cols-2">
              <Input
                type="date"
                value={form.due_date}
                onChange={(event) => setForm((prev) => ({ ...prev, due_date: event.target.value }))}
                disabled={isPending}
              />
              <Input
                type="datetime-local"
                value={form.sla_due_at}
                onChange={(event) => setForm((prev) => ({ ...prev, sla_due_at: event.target.value }))}
                disabled={isPending}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder="Item principal"
                value={form.itemLabel}
                onChange={(event) => setForm((prev) => ({ ...prev, itemLabel: event.target.value }))}
                disabled={isPending}
              />
              <Input
                placeholder="Detalhes do item"
                value={form.itemDetails}
                onChange={(event) => setForm((prev) => ({ ...prev, itemDetails: event.target.value }))}
                disabled={isPending}
              />
            </div>

            <div className="flex justify-end">
              <Button
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await createApprovalRequest(projectId, {
                      approval_kind: form.approval_kind,
                      title: form.title,
                      description: form.description || null,
                      due_date: form.due_date || null,
                      sla_due_at: form.sla_due_at || null,
                      items: [
                        {
                          label: form.itemLabel || form.title,
                          details: form.itemDetails || null,
                        },
                      ],
                    })

                    if (result.error) {
                      toast.error(result.error)
                      return
                    }

                    setForm({
                      approval_kind: 'delivery',
                      title: '',
                      description: '',
                      due_date: '',
                      sla_due_at: '',
                      itemLabel: '',
                      itemDetails: '',
                    })
                    done('Solicitacao criada')
                  })
                }
              >
                Criar solicitacao
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-3">
        {approvals.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Nenhuma aprovacao criada ate o momento.
            </CardContent>
          </Card>
        ) : (
          approvals.map((approval) => (
            <Card key={approval.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{approval.title}</CardTitle>
                    <CardDescription>
                      {approvalKindLabel(approval.approval_kind)} | {approvalStatusLabel(approval.status)}
                    </CardDescription>
                  </div>
                  {approval.due_date ? (
                    <span className="text-xs text-muted-foreground">Prazo {approval.due_date}</span>
                  ) : null}
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {approval.description ? (
                  <p className="text-sm text-muted-foreground">{approval.description}</p>
                ) : null}

                {approval.items?.length ? (
                  <div className="space-y-2">
                    {approval.items.map((item) => (
                      <div key={item.id} className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        {item.details ? (
                          <p className="text-sm text-muted-foreground">{item.details}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}

                {approval.status === 'pending' && !isAdmin ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          const result = await decideApproval({
                            approvalId: approval.id,
                            decision: 'approved',
                          })
                          if (result.error) {
                            toast.error(result.error)
                            return
                          }
                          done('Aprovacao registrada')
                        })
                      }
                    >
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          const result = await decideApproval({
                            approvalId: approval.id,
                            decision: 'revision_requested',
                          })
                          if (result.error) {
                            toast.error(result.error)
                            return
                          }
                          done('Revisao solicitada')
                        })
                      }
                    >
                      Solicitar revisao
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
