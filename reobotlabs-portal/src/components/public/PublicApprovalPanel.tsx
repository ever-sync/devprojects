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
          <div key={approval.id} className="group overflow-hidden rounded-[40px] border border-white/80 bg-white/40 backdrop-blur-xl p-8 shadow-[0_24px_60px_rgba(15,23,42,0.06)] transition-all duration-300 hover:bg-white/60">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between font-medium">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/50 backdrop-blur-sm px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {kindLabel}
                  </span>
                  <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${statusStyle} bg-white/50 backdrop-blur-sm`}>
                    {statusLabel}
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold tracking-tight text-slate-950">{approval.title}</h3>
                  {approval.description && (
                    <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600 font-medium">{approval.description}</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/80 bg-white/50 px-5 py-4 text-xs shadow-sm transition-all group-hover:bg-white lg:max-w-[240px]">
                <div className="flex items-center gap-2 text-slate-500 font-bold">
                  <CalendarClock className="h-4 w-4" />
                  <span className="uppercase tracking-wider">{approval.due_date ? `Prazo: ${approval.due_date}` : 'Sem prazo definido'}</span>
                </div>
              </div>
            </div>

            {approval.items?.length ? (
              <div className="mt-8 grid gap-4 md:grid-cols-2">
                {approval.items.map((item) => (
                  <div key={item.id} className="group/item rounded-[32px] border border-white/80 bg-white/50 p-6 transition-all hover:bg-white hover:shadow-md">
                    <div className="mb-3 flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-transform group-hover/item:scale-110">
                        <ClipboardCheck className="h-4 w-4" />
                      </span>
                      <p className="text-sm font-bold text-slate-900 tracking-tight">{item.label}</p>
                    </div>
                    {item.details ? (
                      <p className="text-sm leading-7 text-slate-600 font-medium">{item.details}</p>
                    ) : (
                      <p className="text-sm italic text-slate-400">Nenhum detalhe adicional.</p>
                    )}
                  </div>
                ))}
              </div>
            ) : null}

            {approval.status === 'pending' ? (
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
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
                      toast.success('Aprovação registrada com sucesso!')
                      router.refresh()
                    })
                  }
                  className="h-12 flex-1 sm:flex-none rounded-2xl bg-slate-950 px-8 text-xs font-bold text-white transition-all hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-950/20 sm:w-auto"
                >
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Aprovar agora
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await decideApprovalByToken(token, approval.id, 'revision_requested')
                      if (result.error) {
                        toast.error(result.error)
                        return
                      }
                      toast.success('Revisão solicitada com sucesso!')
                      router.refresh()
                    })
                  }
                  className="h-12 flex-1 sm:flex-none rounded-2xl border border-slate-200 bg-white px-6 text-xs font-bold text-slate-600 transition-all hover:bg-slate-50 sm:w-auto"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Solicitar revisão
                </Button>
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
