'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  createChangeRequest,
  createScopeVersion,
  updateChangeRequestStatus,
  updateProjectBaseline,
} from '@/actions/scope'
import type { ChangeRequest, ChangeRequestItem, ProjectScopeVersion } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScopeDiffViewer } from '@/components/projects/ScopeDiffViewer'

interface ScopeManagementProps {
  projectId: string
  project: {
    baseline_start_date: string | null
    baseline_end_date: string | null
    baseline_hours: number | null
    baseline_value: number | null
    contract_value: number | null
    margin_percent: number | null
  }
  scopeVersions: ProjectScopeVersion[]
  changeRequests: Array<ChangeRequest & { items: ChangeRequestItem[] }>
  isAdmin: boolean
}

function changeRequestStatusLabel(status: string) {
  if (status === 'submitted') return 'Em analise'
  if (status === 'approved') return 'Aprovada'
  if (status === 'rejected') return 'Rejeitada'
  return status.replace('_', ' ')
}

export function ScopeManagement({
  projectId,
  project,
  scopeVersions,
  changeRequests,
  isAdmin,
}: ScopeManagementProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [baseline, setBaseline] = useState({
    baseline_start_date: project.baseline_start_date ?? '',
    baseline_end_date: project.baseline_end_date ?? '',
    baseline_hours: project.baseline_hours?.toString() ?? '',
    baseline_value: project.baseline_value?.toString() ?? '',
    contract_value: project.contract_value?.toString() ?? '',
    margin_percent: project.margin_percent?.toString() ?? '',
  })
  const [scopeForm, setScopeForm] = useState({
    title: '',
    summary: '',
    assumptions: '',
    exclusions: '',
    dependencies: '',
    scope_body: '',
  })
  const [requestForm, setRequestForm] = useState({
    title: '',
    description: '',
    impact_summary: '',
    requested_deadline: '',
    scopeLabel: '',
    scopeOld: '',
    scopeNew: '',
  })

  const currentVersion = useMemo(() => scopeVersions[0] ?? null, [scopeVersions])

  function done(message: string) {
    toast.success(message)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Baseline comercial e operacional</CardTitle>
            <CardDescription>
              Use esta referencia para comparar prazo, horas, valor e margem ao longo do projeto.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4 sm:grid-cols-2">
            {[
              ['baseline_start_date', 'Inicio da baseline', 'date'],
              ['baseline_end_date', 'Fim da baseline', 'date'],
              ['baseline_hours', 'Horas planejadas', 'number'],
              ['baseline_value', 'Valor baseline', 'number'],
              ['contract_value', 'Valor de contrato', 'number'],
              ['margin_percent', 'Margem alvo (%)', 'number'],
            ].map(([key, label, type]) => (
              <div key={key} className="space-y-2">
                <label className="text-sm font-medium text-foreground">{label}</label>
                <Input
                  type={type}
                  value={baseline[key as keyof typeof baseline]}
                  onChange={(event) =>
                    setBaseline((prev) => ({ ...prev, [key]: event.target.value }))
                  }
                  disabled={!isAdmin || isPending}
                />
              </div>
            ))}

            {isAdmin ? (
              <div className="flex justify-end sm:col-span-2">
                <Button
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await updateProjectBaseline(projectId, {
                        baseline_start_date: baseline.baseline_start_date || null,
                        baseline_end_date: baseline.baseline_end_date || null,
                        baseline_hours: baseline.baseline_hours ? Number(baseline.baseline_hours) : null,
                        baseline_value: baseline.baseline_value ? Number(baseline.baseline_value) : null,
                        contract_value: baseline.contract_value ? Number(baseline.contract_value) : null,
                        margin_percent: baseline.margin_percent ? Number(baseline.margin_percent) : null,
                      })

                      if (result.error) {
                        toast.error(result.error)
                        return
                      }

                      done('Baseline atualizada')
                    })
                  }
                >
                  Salvar baseline
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Escopo vigente</CardTitle>
            <CardDescription>
              Esta e a versao mais recente publicada como referencia oficial do combinado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {currentVersion ? (
              <>
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Versao {currentVersion.version_number}
                  </p>
                  <p className="mt-1 font-semibold text-foreground">{currentVersion.title}</p>
                  {currentVersion.summary ? (
                    <p className="mt-2 text-sm text-muted-foreground">{currentVersion.summary}</p>
                  ) : null}
                </div>
                <div className="whitespace-pre-line rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">
                  {currentVersion.scope_body}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma versao de escopo publicada ainda.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Versoes de escopo</CardTitle>
          <CardDescription>
            Publique uma nova versao sempre que o combinado estrutural mudar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAdmin ? (
            <div className="grid gap-3">
              <Input
                placeholder="Titulo da versao"
                value={scopeForm.title}
                onChange={(event) => setScopeForm((prev) => ({ ...prev, title: event.target.value }))}
                disabled={isPending}
              />
              <Textarea
                placeholder="Resumo executivo"
                value={scopeForm.summary}
                onChange={(event) => setScopeForm((prev) => ({ ...prev, summary: event.target.value }))}
                disabled={isPending}
              />
              <Textarea
                placeholder="Escopo detalhado"
                value={scopeForm.scope_body}
                onChange={(event) => setScopeForm((prev) => ({ ...prev, scope_body: event.target.value }))}
                disabled={isPending}
              />
              <div className="grid gap-3 md:grid-cols-3">
                <Textarea
                  placeholder="Premissas"
                  value={scopeForm.assumptions}
                  onChange={(event) => setScopeForm((prev) => ({ ...prev, assumptions: event.target.value }))}
                  disabled={isPending}
                />
                <Textarea
                  placeholder="Exclusoes"
                  value={scopeForm.exclusions}
                  onChange={(event) => setScopeForm((prev) => ({ ...prev, exclusions: event.target.value }))}
                  disabled={isPending}
                />
                <Textarea
                  placeholder="Dependencias"
                  value={scopeForm.dependencies}
                  onChange={(event) => setScopeForm((prev) => ({ ...prev, dependencies: event.target.value }))}
                  disabled={isPending}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await createScopeVersion(projectId, {
                        title: scopeForm.title,
                        summary: scopeForm.summary || null,
                        assumptions: scopeForm.assumptions || null,
                        exclusions: scopeForm.exclusions || null,
                        dependencies: scopeForm.dependencies || null,
                        scope_body: scopeForm.scope_body,
                      })

                      if (result.error) {
                        toast.error(result.error)
                        return
                      }

                      setScopeForm({
                        title: '',
                        summary: '',
                        assumptions: '',
                        exclusions: '',
                        dependencies: '',
                        scope_body: '',
                      })
                      done('Versao publicada')
                    })
                  }
                >
                  Publicar versao
                </Button>
              </div>
            </div>
          ) : null}

          <div className="space-y-3">
            {scopeVersions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma versao publicada.</p>
            ) : (
              scopeVersions.map((version) => (
                <div key={version.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        V{version.version_number} | {version.title}
                      </p>
                      {version.summary ? (
                        <p className="mt-1 text-sm text-muted-foreground">{version.summary}</p>
                      ) : null}
                    </div>
                    <span className="text-xs text-muted-foreground">{version.created_at.slice(0, 10)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <ScopeDiffViewer scopeVersions={scopeVersions} />

      <Card>
        <CardHeader>
          <CardTitle>Solicitacoes de mudanca</CardTitle>
          <CardDescription>
            Registre impacto de escopo, prazo, horas e budget em um fluxo formal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAdmin ? (
            <div className="grid gap-3">
              <Input
                placeholder="Titulo da solicitacao"
                value={requestForm.title}
                onChange={(event) => setRequestForm((prev) => ({ ...prev, title: event.target.value }))}
                disabled={isPending}
              />
              <Textarea
                placeholder="Descreva a mudanca"
                value={requestForm.description}
                onChange={(event) => setRequestForm((prev) => ({ ...prev, description: event.target.value }))}
                disabled={isPending}
              />
              <Input
                placeholder="Resumo do impacto"
                value={requestForm.impact_summary}
                onChange={(event) =>
                  setRequestForm((prev) => ({ ...prev, impact_summary: event.target.value }))
                }
                disabled={isPending}
              />
              <Input
                type="date"
                value={requestForm.requested_deadline}
                onChange={(event) =>
                  setRequestForm((prev) => ({ ...prev, requested_deadline: event.target.value }))
                }
                disabled={isPending}
              />
              <div className="grid gap-3 md:grid-cols-3">
                <Input
                  placeholder="Impacto principal"
                  value={requestForm.scopeLabel}
                  onChange={(event) => setRequestForm((prev) => ({ ...prev, scopeLabel: event.target.value }))}
                  disabled={isPending}
                />
                <Input
                  placeholder="Valor anterior"
                  value={requestForm.scopeOld}
                  onChange={(event) => setRequestForm((prev) => ({ ...prev, scopeOld: event.target.value }))}
                  disabled={isPending}
                />
                <Input
                  placeholder="Novo valor"
                  value={requestForm.scopeNew}
                  onChange={(event) => setRequestForm((prev) => ({ ...prev, scopeNew: event.target.value }))}
                  disabled={isPending}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await createChangeRequest(projectId, {
                        title: requestForm.title,
                        description: requestForm.description,
                        impact_summary: requestForm.impact_summary || null,
                        requested_deadline: requestForm.requested_deadline || null,
                        items: [
                          {
                            item_type: 'scope',
                            label: requestForm.scopeLabel || 'Mudanca de escopo',
                            old_value: requestForm.scopeOld || null,
                            new_value: requestForm.scopeNew || null,
                          },
                        ],
                      })

                      if (result.error) {
                        toast.error(result.error)
                        return
                      }

                      setRequestForm({
                        title: '',
                        description: '',
                        impact_summary: '',
                        requested_deadline: '',
                        scopeLabel: '',
                        scopeOld: '',
                        scopeNew: '',
                      })
                      done('Solicitacao criada')
                    })
                  }
                >
                  Abrir change request
                </Button>
              </div>
            </div>
          ) : null}

          <div className="space-y-3">
            {changeRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma solicitacao de mudanca registrada.</p>
            ) : (
              changeRequests.map((request) => (
                <div key={request.id} className="space-y-3 rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{request.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{request.description}</p>
                    </div>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                      {changeRequestStatusLabel(request.status)}
                    </span>
                  </div>

                  {request.items?.length ? (
                    <div className="space-y-2">
                      {request.items.map((item) => (
                        <div key={item.id} className="rounded-lg bg-muted/40 p-3 text-sm">
                          <p className="font-medium text-foreground">{item.label}</p>
                          <p className="text-muted-foreground">
                            {item.old_value || 'Sem referencia'} {'->'} {item.new_value || 'Sem novo valor'}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {isAdmin && request.status === 'submitted' ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={isPending}
                        onClick={() =>
                          startTransition(async () => {
                            const result = await updateChangeRequestStatus(projectId, request.id, 'approved')
                            if (result.error) {
                              toast.error(result.error)
                              return
                            }
                            done('Solicitacao aprovada')
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
                            const result = await updateChangeRequestStatus(projectId, request.id, 'rejected')
                            if (result.error) {
                              toast.error(result.error)
                              return
                            }
                            done('Solicitacao rejeitada')
                          })
                        }
                      >
                        Rejeitar
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
