'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AlertTriangle, GitBranch, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  createProjectRisk,
  createTaskDependency,
  removeTaskDependency,
  upsertTeamCapacity,
  updateProjectRiskStatus,
} from '@/actions/execution'

interface ExecutionPanelProps {
  projectId: string
  tasks: Array<{
    id: string
    title: string
    status: string
    blocked_reason: string | null
    blocked_since: string | null
    remaining_hours: number | null
    estimated_hours: number | null
    actual_hours: number | null
    assignee_id: string | null
    assignee: { id: string; full_name: string } | null
  }>
  dependencies: Array<{
    id: string
    task: { id: string; title: string } | null
    dependency: { id: string; title: string } | null
  }>
  risks: Array<{
    id: string
    title: string
    description: string | null
    status: 'open' | 'mitigating' | 'closed'
    level: 'low' | 'medium' | 'high'
    mitigation_plan: string | null
    owner: { id: string; full_name: string } | null
  }>
  capacities: Array<{
    id: string
    week_start: string
    capacity_hours: number
    allocated_hours: number
    notes: string | null
    user: { id: string; full_name: string } | null
  }>
  teamMembers: Array<{ id: string; full_name: string }>
}

export function ExecutionPanel({
  projectId,
  tasks,
  dependencies,
  risks,
  capacities,
  teamMembers,
}: ExecutionPanelProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [dependencyForm, setDependencyForm] = useState({
    task_id: '',
    depends_on_task_id: '',
  })
  const [riskForm, setRiskForm] = useState({
    title: '',
    description: '',
    level: 'medium' as 'low' | 'medium' | 'high',
    owner_id: '',
    mitigation_plan: '',
  })
  const [capacityForm, setCapacityForm] = useState({
    user_id: '',
    week_start: new Date().toISOString().slice(0, 10),
    capacity_hours: '',
    allocated_hours: '',
    notes: '',
  })

  const blockedTasks = useMemo(
    () => tasks.filter((task) => task.blocked_reason || task.status === 'blocked'),
    [tasks],
  )

  function done(message: string) {
    toast.success(message)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Tarefas bloqueadas</CardDescription>
            <CardTitle>{blockedTasks.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Dependencias mapeadas</CardDescription>
            <CardTitle>{dependencies.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Riscos abertos</CardDescription>
            <CardTitle>{risks.filter((risk) => risk.status !== 'closed').length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Dependencias</CardTitle>
            </div>
            <CardDescription>
              Relacione predecessoras para explicitar bloqueios de fluxo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Select
                value={dependencyForm.task_id || undefined}
                onValueChange={(value) => setDependencyForm((prev) => ({ ...prev, task_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tarefa dependente" />
                </SelectTrigger>
                <SelectContent>
                  {tasks.map((task) => (
                    <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={dependencyForm.depends_on_task_id || undefined}
                onValueChange={(value) => setDependencyForm((prev) => ({ ...prev, depends_on_task_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Depende de" />
                </SelectTrigger>
                <SelectContent>
                  {tasks
                    .filter((task) => task.id !== dependencyForm.task_id)
                    .map((task) => (
                      <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end">
              <Button
                disabled={isPending}
                onClick={() => startTransition(async () => {
                  const result = await createTaskDependency(
                    projectId,
                    dependencyForm.task_id,
                    dependencyForm.depends_on_task_id,
                  )
                  if (result.error) {
                    toast.error(result.error)
                    return
                  }
                  setDependencyForm({ task_id: '', depends_on_task_id: '' })
                  done('Dependencia criada')
                })}
              >
                Adicionar dependencia
              </Button>
            </div>

            <div className="space-y-3">
              {dependencies.map((dependency) => (
                <div key={dependency.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                  <div className="text-sm">
                    <span className="font-medium text-foreground">{dependency.task?.title ?? 'Tarefa'}</span>
                    <span className="mx-2 text-muted-foreground">depende de</span>
                    <span className="text-muted-foreground">{dependency.dependency?.title ?? 'Tarefa'}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => startTransition(async () => {
                      const result = await removeTaskDependency(projectId, dependency.id)
                      if (result.error) {
                        toast.error(result.error)
                        return
                      }
                      done('Dependencia removida')
                    })}
                  >
                    Remover
                  </Button>
                </div>
              ))}
              {dependencies.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma dependencia cadastrada.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Riscos do projeto</CardTitle>
            </div>
            <CardDescription>
              Registre riscos cedo para reduzir surpresa de prazo, escopo ou capacidade.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Titulo do risco"
              value={riskForm.title}
              onChange={(e) => setRiskForm((prev) => ({ ...prev, title: e.target.value }))}
              disabled={isPending}
            />
            <Textarea
              placeholder="Descricao"
              value={riskForm.description}
              onChange={(e) => setRiskForm((prev) => ({ ...prev, description: e.target.value }))}
              disabled={isPending}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <Select
                value={riskForm.level}
                onValueChange={(value: 'low' | 'medium' | 'high') => setRiskForm((prev) => ({ ...prev, level: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nivel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixo</SelectItem>
                  <SelectItem value="medium">Medio</SelectItem>
                  <SelectItem value="high">Alto</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={riskForm.owner_id || 'none'}
                onValueChange={(value) => setRiskForm((prev) => ({ ...prev, owner_id: value === 'none' ? '' : value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Responsavel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem responsavel</SelectItem>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>{member.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              placeholder="Plano de mitigacao"
              value={riskForm.mitigation_plan}
              onChange={(e) => setRiskForm((prev) => ({ ...prev, mitigation_plan: e.target.value }))}
              disabled={isPending}
            />
            <div className="flex justify-end">
              <Button
                disabled={isPending}
                onClick={() => startTransition(async () => {
                  const result = await createProjectRisk(projectId, {
                    title: riskForm.title,
                    description: riskForm.description || null,
                    level: riskForm.level,
                    owner_id: riskForm.owner_id || null,
                    mitigation_plan: riskForm.mitigation_plan || null,
                    status: 'open',
                  })
                  if (result.error) {
                    toast.error(result.error)
                    return
                  }
                  setRiskForm({
                    title: '',
                    description: '',
                    level: 'medium',
                    owner_id: '',
                    mitigation_plan: '',
                  })
                  done('Risco registrado')
                })}
              >
                Registrar risco
              </Button>
            </div>

            <div className="space-y-3">
              {risks.map((risk) => (
                <div key={risk.id} className="rounded-xl border border-border p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{risk.title}</p>
                      {risk.description && (
                        <p className="mt-1 text-sm text-muted-foreground">{risk.description}</p>
                      )}
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p className="capitalize">{risk.level}</p>
                      <p className="capitalize">{risk.status}</p>
                    </div>
                  </div>
                  {risk.mitigation_plan && (
                    <p className="text-sm text-muted-foreground">Mitigacao: {risk.mitigation_plan}</p>
                  )}
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      Responsavel: {risk.owner?.full_name ?? 'Nao definido'}
                    </p>
                    {risk.status !== 'closed' && (
                      <div className="flex gap-2">
                        {risk.status === 'open' && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => startTransition(async () => {
                              const result = await updateProjectRiskStatus(projectId, risk.id, 'mitigating')
                              if (result.error) {
                                toast.error(result.error)
                                return
                              }
                              done('Risco em mitigacao')
                            })}
                          >
                            Mitigar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          disabled={isPending}
                          onClick={() => startTransition(async () => {
                            const result = await updateProjectRiskStatus(projectId, risk.id, 'closed')
                            if (result.error) {
                              toast.error(result.error)
                              return
                            }
                            done('Risco encerrado')
                          })}
                        >
                          Encerrar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {risks.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum risco registrado.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Capacidade semanal</CardTitle>
          </div>
          <CardDescription>
            Compare horas disponiveis vs horas alocadas para antecipar sobrecarga.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-5">
            <Select
              value={capacityForm.user_id || undefined}
              onValueChange={(value) => setCapacityForm((prev) => ({ ...prev, user_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pessoa" />
              </SelectTrigger>
              <SelectContent>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>{member.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={capacityForm.week_start}
              onChange={(e) => setCapacityForm((prev) => ({ ...prev, week_start: e.target.value }))}
              disabled={isPending}
            />
            <Input
              type="number"
              step="0.5"
              placeholder="Capacidade"
              value={capacityForm.capacity_hours}
              onChange={(e) => setCapacityForm((prev) => ({ ...prev, capacity_hours: e.target.value }))}
              disabled={isPending}
            />
            <Input
              type="number"
              step="0.5"
              placeholder="Alocado"
              value={capacityForm.allocated_hours}
              onChange={(e) => setCapacityForm((prev) => ({ ...prev, allocated_hours: e.target.value }))}
              disabled={isPending}
            />
            <Button
              disabled={isPending}
              onClick={() => startTransition(async () => {
                const result = await upsertTeamCapacity({
                  user_id: capacityForm.user_id,
                  week_start: capacityForm.week_start,
                  capacity_hours: Number(capacityForm.capacity_hours),
                  allocated_hours: Number(capacityForm.allocated_hours),
                  notes: capacityForm.notes || null,
                })
                if (result.error) {
                  toast.error(result.error)
                  return
                }
                setCapacityForm((prev) => ({ ...prev, user_id: '', capacity_hours: '', allocated_hours: '', notes: '' }))
                done('Capacidade atualizada')
              })}
            >
              Salvar
            </Button>
          </div>
          <Textarea
            placeholder="Notas da semana"
            value={capacityForm.notes}
            onChange={(e) => setCapacityForm((prev) => ({ ...prev, notes: e.target.value }))}
            disabled={isPending}
          />

          <div className="space-y-3">
            {capacities.map((capacity) => {
              const remaining = capacity.capacity_hours - capacity.allocated_hours
              return (
                <div key={capacity.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{capacity.user?.full_name ?? 'Pessoa'}</p>
                      <p className="text-sm text-muted-foreground">Semana de {capacity.week_start}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${remaining < 0 ? 'text-red-400' : 'text-foreground'}`}>
                        {remaining.toFixed(1)}h livres
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {capacity.allocated_hours}h / {capacity.capacity_hours}h
                      </p>
                    </div>
                  </div>
                  {capacity.notes && (
                    <p className="mt-2 text-sm text-muted-foreground">{capacity.notes}</p>
                  )}
                </div>
              )
            })}
            {capacities.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma capacidade cadastrada.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
