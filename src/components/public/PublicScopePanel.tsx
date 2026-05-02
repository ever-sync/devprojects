'use client'

import { Badge } from '@/components/ui/badge'

type PublicScopeVersion = {
  id: string
  version_number: number
  title: string
  summary: string | null
  scope_body: string
  created_at: string
}

type PublicChangeRequest = {
  id: string
  title: string
  impact_summary: string | null
  status: string
  requested_deadline: string | null
  created_at: string
}

function toLines(text: string | null | undefined) {
  return (text ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function getDiffStats(baseText: string | null | undefined, currentText: string | null | undefined) {
  const base = toLines(baseText)
  const current = toLines(currentText)
  const max = Math.max(base.length, current.length)
  let added = 0
  let removed = 0
  let changed = 0

  for (let index = 0; index < max; index++) {
    const left = base[index] ?? ''
    const right = current[index] ?? ''

    if (!left && right) {
      added += 1
      continue
    }
    if (left && !right) {
      removed += 1
      continue
    }
    if (left && right && left !== right) {
      changed += 1
    }
  }

  return { added, removed, changed }
}

function statusBadge(status: string) {
  if (status === 'approved') return <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20">Aprovada</Badge>
  if (status === 'rejected') return <Badge className="bg-red-500/10 text-red-700 border-red-500/20">Rejeitada</Badge>
  if (status === 'submitted') return <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20">Em analise</Badge>
  return <Badge variant="outline">{status}</Badge>
}

export function PublicScopePanel({
  scopeVersions,
  changeRequests,
}: {
  scopeVersions: PublicScopeVersion[]
  changeRequests: PublicChangeRequest[]
}) {
  const ordered = [...scopeVersions].sort((a, b) => b.version_number - a.version_number)
  const currentVersion = ordered[0] ?? null
  const previousVersion = ordered[1] ?? null
  const diffStats = getDiffStats(previousVersion?.scope_body, currentVersion?.scope_body)

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-emerald-200/70 bg-emerald-50/70 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700/70">Versao atual</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {currentVersion ? `V${currentVersion.version_number}` : '-'}
          </p>
          <p className="text-xs text-slate-500">{currentVersion?.title ?? 'Sem versao publicada'}</p>
        </div>
        <div className="rounded-[24px] border border-sky-200/70 bg-sky-50/70 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-700/70">Mudancas da ultima versao</p>
          <p className="mt-2 text-sm font-semibold text-slate-950">
            +{diffStats.added} adicao(oes) · -{diffStats.removed} remocao(oes)
          </p>
          <p className="text-xs text-slate-500">{diffStats.changed} alteracao(oes) de conteudo</p>
        </div>
        <div className="rounded-[24px] border border-amber-200/70 bg-amber-50/70 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700/70">Solicitacoes de mudanca</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{changeRequests.length}</p>
          <p className="text-xs text-slate-500">Historico de ajustes de escopo</p>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/80 bg-white/70 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.05)] backdrop-blur-md">
        <h3 className="text-lg font-semibold text-slate-950">Historico de versoes</h3>
        <div className="mt-4 space-y-3">
          {ordered.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma versao de escopo publicada.</p>
          ) : (
            ordered.map((version) => (
              <div key={version.id} className="rounded-2xl border border-slate-200 bg-white/75 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-950">
                    V{version.version_number} | {version.title}
                  </p>
                  <p className="text-xs text-slate-500">{version.created_at.slice(0, 10)}</p>
                </div>
                {version.summary ? (
                  <p className="mt-2 text-sm text-slate-600">{version.summary}</p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-[28px] border border-white/80 bg-white/70 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.05)] backdrop-blur-md">
        <h3 className="text-lg font-semibold text-slate-950">Solicitacoes de mudanca</h3>
        <div className="mt-4 space-y-3">
          {changeRequests.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma solicitacao registrada.</p>
          ) : (
            changeRequests.map((request) => (
              <div key={request.id} className="rounded-2xl border border-slate-200 bg-white/75 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-950">{request.title}</p>
                  {statusBadge(request.status)}
                </div>
                {request.impact_summary ? (
                  <p className="mt-2 text-sm text-slate-600">{request.impact_summary}</p>
                ) : null}
                <p className="mt-2 text-xs text-slate-500">
                  Criada em {request.created_at.slice(0, 10)}
                  {request.requested_deadline ? ` · Prazo solicitado: ${request.requested_deadline}` : ''}
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
