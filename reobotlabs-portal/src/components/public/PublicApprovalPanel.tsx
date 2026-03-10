'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { decideApprovalByToken } from '@/actions/approvals'
import type { Approval, ApprovalItem } from '@/types'
import { Button } from '@/components/ui/button'
import { CalendarClock, CheckCircle2, ClipboardCheck, Loader2, RotateCcw } from 'lucide-react'

interface PublicApprovalPanelProps {
  token: string
  approvals: Array<Approval & { items: ApprovalItem[] }>
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Recusado',
  revision_requested: 'Revisao solicitada',
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  rejected: 'border-rose-200 bg-rose-50 text-rose-700',
  revision_requested: 'border-sky-200 bg-sky-50 text-sky-700',
}

const KIND_LABELS: Record<string, string> = {
  scope: 'Escopo',
  timeline: 'Cronograma',
  delivery: 'Entrega',
}

export function PublicApprovalPanel({ token, approvals }: PublicApprovalPanelProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  if (approvals.length === 0) {
    return (
      <div className="rounded-[28px] border border-white/70 bg-white/85 px-6 py-16 text-center text-sm text-slate-500 shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
        Nenhuma aprovacao pendente no momento.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {approvals.map((approval) => {
        const statusLabel = STATUS_LABELS[approval.status] ?? approval.status
        const statusStyle = STATUS_STYLES[approval.status] ?? 'border-slate-200 bg-slate-50 text-slate-600'
        const kindLabel = KIND_LABELS[approval.approval_kind] ?? approval.approval_kind

        return (
          <div key={approval.id} className="rounded-[24px] border border-white/70 bg-white/85 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.05)] sm:rounded-[28px] sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {kindLabel}
                  </span>
                  <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusStyle}`}>
                    {statusLabel}
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">{approval.title}</h3>
                  {approval.description && (
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{approval.description}</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600 lg:max-w-[220px]">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-slate-500" />
                  <span>{approval.due_date ? `Prazo ${approval.due_date}` : 'Sem prazo definido'}</span>
                </div>
              </div>
            </div>

            {approval.items?.length ? (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {approval.items.map((item) => (
                  <div key={item.id} className="rounded-3xl border border-slate-200/80 bg-slate-50/80 px-4 py-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-white text-slate-700">
                        <ClipboardCheck className="h-4 w-4" />
                      </span>
                      <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    </div>
                    {item.details ? (
                      <p className="text-sm leading-6 text-slate-600">{item.details}</p>
                    ) : (
                      <p className="text-sm text-slate-400">Sem detalhes adicionais.</p>
                    )}
                  </div>
                ))}
              </div>
            ) : null}

            {approval.status === 'pending' ? (
              <div className="mt-5 grid gap-2 sm:flex sm:flex-wrap">
                <Button
                  size="sm"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await decideApprovalByToken(token, approval.id, 'approved')
                      if (result.error) {
                        toast.error(result.error)
                        return
                      }
                      toast.success('Aprovacao registrada')
                      router.refresh()
                    })
                  }
                  className="h-10 w-full rounded-full bg-slate-950 px-4 text-xs text-white hover:bg-slate-800 sm:w-auto"
                >
                  {isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />}
                  Aprovar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await decideApprovalByToken(token, approval.id, 'revision_requested')
                      if (result.error) {
                        toast.error(result.error)
                        return
                      }
                      toast.success('Revisao solicitada')
                      router.refresh()
                    })
                  }
                  className="h-10 w-full rounded-full border-slate-300 bg-white px-4 text-xs text-slate-700 hover:bg-slate-50 sm:w-auto"
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Pedir revisao
                </Button>
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
