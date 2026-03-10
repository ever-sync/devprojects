'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Receipt, TrendingUp, Wallet } from 'lucide-react'
import { createProjectMarginSnapshot } from '@/actions/margin'
import {
  createBillingMilestone,
  createInvoice,
  updateBillingMilestoneStatus,
  updateInvoiceStatus,
  upsertContract,
} from '@/actions/finance'
import type {
  AuditLog,
  BillingMilestone,
  Contract,
  Invoice,
  InvoiceEvent,
  ProjectCostSnapshot,
} from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface FinancePanelProps {
  projectId: string
  contract: Contract | null
  milestones: BillingMilestone[]
  invoices: Invoice[]
  invoiceEvents: InvoiceEvent[]
  auditLogs: Array<AuditLog & { actor?: { full_name: string } | null }>
  marginSummary: {
    loggedHours: number
    internalCost: number
    billableValue: number
    recognizedRevenue: number
    grossMargin: number
    marginPercentReal: number | null
    targetMargin: number | null
    contractValue: number | null
  } | null
  snapshots: ProjectCostSnapshot[]
}

function formatCurrency(value: number | null | undefined) {
  if (value == null) return '-'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value)
}

function milestoneStatusLabel(status: BillingMilestone['status']) {
  if (status === 'planned') return 'Planejado'
  if (status === 'ready') return 'Pronto para cobrar'
  if (status === 'invoiced') return 'Faturado'
  return 'Pago'
}

function invoiceStatusLabel(status: Invoice['status']) {
  if (status === 'draft') return 'Rascunho'
  if (status === 'issued') return 'Emitida'
  if (status === 'paid') return 'Paga'
  if (status === 'overdue') return 'Vencida'
  return 'Cancelada'
}

export function FinancePanel({
  projectId,
  contract,
  milestones,
  invoices,
  invoiceEvents,
  auditLogs,
  marginSummary,
  snapshots,
}: FinancePanelProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [contractForm, setContractForm] = useState({
    contract_type: contract?.contract_type ?? 'fixed',
    total_value: contract?.total_value?.toString() ?? '',
    currency: contract?.currency ?? 'BRL',
    start_date: contract?.start_date ?? '',
    end_date: contract?.end_date ?? '',
    billing_notes: contract?.billing_notes ?? '',
  })
  const [milestoneForm, setMilestoneForm] = useState({
    title: '',
    description: '',
    due_date: '',
    amount: '',
    status: 'planned' as BillingMilestone['status'],
  })
  const [invoiceForm, setInvoiceForm] = useState({
    billing_milestone_id: '',
    invoice_number: '',
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: '',
    amount: '',
    status: 'draft' as Invoice['status'],
    notes: '',
  })

  const totals = useMemo(
    () => ({
      planned: milestones.reduce((sum, milestone) => sum + Number(milestone.amount ?? 0), 0),
      invoiced: invoices.reduce((sum, invoice) => sum + Number(invoice.amount ?? 0), 0),
      paid: invoices
        .filter((invoice) => invoice.status === 'paid')
        .reduce((sum, invoice) => sum + Number(invoice.amount ?? 0), 0),
    }),
    [milestones, invoices],
  )

  function done(message: string) {
    toast.success(message)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Contrato</CardDescription>
            <CardTitle>{formatCurrency(contract?.total_value)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Marcos planejados</CardDescription>
            <CardTitle>{formatCurrency(totals.planned)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Receita faturada</CardDescription>
            <CardTitle>{formatCurrency(totals.invoiced)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Receita recebida</CardDescription>
            <CardTitle>{formatCurrency(totals.paid)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Custo interno</CardDescription>
            <CardTitle>{formatCurrency(marginSummary?.internalCost)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Receita reconhecida</CardDescription>
            <CardTitle>{formatCurrency(marginSummary?.recognizedRevenue)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Margem bruta</CardDescription>
            <CardTitle className={marginSummary && marginSummary.grossMargin < 0 ? 'text-red-500' : ''}>
              {formatCurrency(marginSummary?.grossMargin)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Margem real</CardDescription>
            <CardTitle>
              {marginSummary?.marginPercentReal != null ? `${marginSummary.marginPercentReal.toFixed(1)}%` : '-'}
            </CardTitle>
            <CardDescription>
              Meta {marginSummary?.targetMargin != null ? `${marginSummary.targetMargin}%` : '-'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Contrato comercial</CardTitle>
            </div>
            <CardDescription>
              Defina o modelo do contrato, janela comercial e observacoes de cobranca.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Select
                value={contractForm.contract_type}
                onValueChange={(value: 'fixed' | 'retainer' | 'hour_bank' | 'sprint') =>
                  setContractForm((prev) => ({ ...prev, contract_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de contrato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fechado</SelectItem>
                  <SelectItem value="retainer">Retainer</SelectItem>
                  <SelectItem value="hour_bank">Banco de horas</SelectItem>
                  <SelectItem value="sprint">Sprint</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                step="0.01"
                placeholder="Valor total"
                value={contractForm.total_value}
                onChange={(event) => setContractForm((prev) => ({ ...prev, total_value: event.target.value }))}
                disabled={isPending}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <Input
                placeholder="Moeda"
                value={contractForm.currency}
                onChange={(event) =>
                  setContractForm((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))
                }
                disabled={isPending}
              />
              <Input
                type="date"
                value={contractForm.start_date}
                onChange={(event) => setContractForm((prev) => ({ ...prev, start_date: event.target.value }))}
                disabled={isPending}
              />
              <Input
                type="date"
                value={contractForm.end_date}
                onChange={(event) => setContractForm((prev) => ({ ...prev, end_date: event.target.value }))}
                disabled={isPending}
              />
            </div>

            <Textarea
              placeholder="Notas de faturamento"
              value={contractForm.billing_notes}
              onChange={(event) => setContractForm((prev) => ({ ...prev, billing_notes: event.target.value }))}
              disabled={isPending}
            />

            <div className="flex justify-end">
              <Button
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await upsertContract(projectId, {
                      contract_type: contractForm.contract_type,
                      total_value: Number(contractForm.total_value),
                      currency: contractForm.currency,
                      start_date: contractForm.start_date || null,
                      end_date: contractForm.end_date || null,
                      billing_notes: contractForm.billing_notes || null,
                    })
                    if (result.error) {
                      toast.error(result.error)
                      return
                    }
                    done('Contrato atualizado')
                  })
                }
              >
                Salvar contrato
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Snapshot de margem</CardTitle>
            </div>
            <CardDescription>
              Registre pontos de controle para acompanhar erosao de margem e esforco consumido.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
              <p className="text-muted-foreground">Horas logadas: {marginSummary?.loggedHours?.toFixed(1) ?? '0.0'}h</p>
              <p className="text-muted-foreground">
                Valor billable teorico: {formatCurrency(marginSummary?.billableValue)}
              </p>
            </div>
            <div className="flex justify-end">
              <Button
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await createProjectMarginSnapshot(projectId)
                    if (result.error) {
                      toast.error(result.error)
                      return
                    }
                    done('Snapshot registrado')
                  })
                }
              >
                Registrar snapshot
              </Button>
            </div>
            <div className="space-y-3">
              {snapshots.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum snapshot registrado.</p>
              ) : (
                snapshots.map((snapshot) => (
                  <div key={snapshot.id} className="rounded-xl border border-border p-4">
                    <p className="font-medium text-foreground">{snapshot.snapshot_date}</p>
                    <p className="text-sm text-muted-foreground">
                      Receita {formatCurrency(snapshot.recognized_revenue)} | custo {formatCurrency(snapshot.internal_cost)}
                    </p>
                    <p className={`text-sm ${snapshot.gross_margin < 0 ? 'text-red-500' : 'text-green-600'}`}>
                      Margem {formatCurrency(snapshot.gross_margin)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Marcos de faturamento</CardTitle>
            </div>
            <CardDescription>
              Planeje quando cada entrega deve ficar pronta para cobranca.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Titulo do marco"
              value={milestoneForm.title}
              onChange={(event) => setMilestoneForm((prev) => ({ ...prev, title: event.target.value }))}
              disabled={isPending}
            />
            <Textarea
              placeholder="Descricao"
              value={milestoneForm.description}
              onChange={(event) => setMilestoneForm((prev) => ({ ...prev, description: event.target.value }))}
              disabled={isPending}
            />
            <div className="grid gap-3 md:grid-cols-3">
              <Input
                type="date"
                value={milestoneForm.due_date}
                onChange={(event) => setMilestoneForm((prev) => ({ ...prev, due_date: event.target.value }))}
                disabled={isPending}
              />
              <Input
                type="number"
                step="0.01"
                placeholder="Valor"
                value={milestoneForm.amount}
                onChange={(event) => setMilestoneForm((prev) => ({ ...prev, amount: event.target.value }))}
                disabled={isPending}
              />
              <Select
                value={milestoneForm.status}
                onValueChange={(value: BillingMilestone['status']) =>
                  setMilestoneForm((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planejado</SelectItem>
                  <SelectItem value="ready">Pronto para cobrar</SelectItem>
                  <SelectItem value="invoiced">Faturado</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end">
              <Button
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await createBillingMilestone(projectId, contract?.id ?? null, {
                      title: milestoneForm.title,
                      description: milestoneForm.description || null,
                      due_date: milestoneForm.due_date || null,
                      amount: Number(milestoneForm.amount),
                      status: milestoneForm.status,
                    })
                    if (result.error) {
                      toast.error(result.error)
                      return
                    }
                    setMilestoneForm({
                      title: '',
                      description: '',
                      due_date: '',
                      amount: '',
                      status: 'planned',
                    })
                    done('Marco criado')
                  })
                }
              >
                Criar marco
              </Button>
            </div>

            <div className="space-y-3">
              {milestones.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum marco criado.</p>
              ) : (
                milestones.map((milestone) => (
                  <div key={milestone.id} className="rounded-xl border border-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{milestone.title}</p>
                        <p className="text-sm text-muted-foreground">{formatCurrency(milestone.amount)}</p>
                      </div>
                      <Select
                        value={milestone.status}
                        onValueChange={(value: BillingMilestone['status']) =>
                          startTransition(async () => {
                            const result = await updateBillingMilestoneStatus(projectId, milestone.id, value)
                            if (result.error) {
                              toast.error(result.error)
                              return
                            }
                            done('Marco atualizado')
                          })
                        }
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="planned">Planejado</SelectItem>
                          <SelectItem value="ready">Pronto para cobrar</SelectItem>
                          <SelectItem value="invoiced">Faturado</SelectItem>
                          <SelectItem value="paid">Pago</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Status atual: {milestoneStatusLabel(milestone.status)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
            <CardDescription>Registre emissao, vencimento e recebimento por projeto.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 xl:grid-cols-6">
              <Select
                value={invoiceForm.billing_milestone_id || 'none'}
                onValueChange={(value) =>
                  setInvoiceForm((prev) => ({
                    ...prev,
                    billing_milestone_id: value === 'none' ? '' : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Marco" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem marco</SelectItem>
                  {milestones.map((milestone) => (
                    <SelectItem key={milestone.id} value={milestone.id}>
                      {milestone.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Numero"
                value={invoiceForm.invoice_number}
                onChange={(event) => setInvoiceForm((prev) => ({ ...prev, invoice_number: event.target.value }))}
                disabled={isPending}
              />
              <Input
                type="date"
                value={invoiceForm.issue_date}
                onChange={(event) => setInvoiceForm((prev) => ({ ...prev, issue_date: event.target.value }))}
                disabled={isPending}
              />
              <Input
                type="date"
                value={invoiceForm.due_date}
                onChange={(event) => setInvoiceForm((prev) => ({ ...prev, due_date: event.target.value }))}
                disabled={isPending}
              />
              <Input
                type="number"
                step="0.01"
                placeholder="Valor"
                value={invoiceForm.amount}
                onChange={(event) => setInvoiceForm((prev) => ({ ...prev, amount: event.target.value }))}
                disabled={isPending}
              />
              <Select
                value={invoiceForm.status}
                onValueChange={(value: Invoice['status']) =>
                  setInvoiceForm((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="issued">Emitida</SelectItem>
                  <SelectItem value="paid">Paga</SelectItem>
                  <SelectItem value="overdue">Vencida</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Textarea
              placeholder="Observacoes"
              value={invoiceForm.notes}
              onChange={(event) => setInvoiceForm((prev) => ({ ...prev, notes: event.target.value }))}
              disabled={isPending}
            />

            <div className="flex justify-end">
              <Button
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await createInvoice(projectId, contract?.id ?? null, {
                      billing_milestone_id: invoiceForm.billing_milestone_id || null,
                      invoice_number: invoiceForm.invoice_number,
                      issue_date: invoiceForm.issue_date,
                      due_date: invoiceForm.due_date || null,
                      amount: Number(invoiceForm.amount),
                      status: invoiceForm.status,
                      notes: invoiceForm.notes || null,
                    })
                    if (result.error) {
                      toast.error(result.error)
                      return
                    }
                    setInvoiceForm({
                      billing_milestone_id: '',
                      invoice_number: '',
                      issue_date: new Date().toISOString().slice(0, 10),
                      due_date: '',
                      amount: '',
                      status: 'draft',
                      notes: '',
                    })
                    done('Invoice criada')
                  })
                }
              >
                Criar invoice
              </Button>
            </div>

            <div className="space-y-3">
              {invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma invoice registrada.</p>
              ) : (
                invoices.map((invoice) => (
                  <div key={invoice.id} className="rounded-xl border border-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{invoice.invoice_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(invoice.amount)} | emissao {invoice.issue_date}
                        </p>
                      </div>
                      <Select
                        value={invoice.status}
                        onValueChange={(value: Invoice['status']) =>
                          startTransition(async () => {
                            const result = await updateInvoiceStatus(projectId, invoice.id, value)
                            if (result.error) {
                              toast.error(result.error)
                              return
                            }
                            done('Invoice atualizada')
                          })
                        }
                      >
                        <SelectTrigger className="w-[160px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Rascunho</SelectItem>
                          <SelectItem value="issued">Emitida</SelectItem>
                          <SelectItem value="paid">Paga</SelectItem>
                          <SelectItem value="overdue">Vencida</SelectItem>
                          <SelectItem value="cancelled">Cancelada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Status atual: {invoiceStatusLabel(invoice.status)}
                    </p>
                  </div>
                ))
              )}
            </div>

            {invoiceEvents.length ? (
              <div className="rounded-xl border border-border p-4">
                <p className="mb-3 text-sm font-semibold text-foreground">Historico recente</p>
                <div className="space-y-2">
                  {invoiceEvents.slice(0, 8).map((event) => (
                    <div key={event.id} className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{event.event_type}</span>
                      {event.description ? ` | ${event.description}` : ''}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Auditoria financeira</CardTitle>
          <CardDescription>
            Historico de alteracoes estruturais em contratos, marcos e invoices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {auditLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum evento auditado no financeiro.</p>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log) => (
                <div key={log.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">{log.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {log.actor?.full_name ?? 'Sistema'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
