import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface CapacityPlanningPanelProps {
  horizonWeeks: number
  weekStart: string
  weekEnd: string
  overloadedCount: number
  warningCount: number
  teamUtilization: number
  people: Array<{
    userId: string
    fullName: string
    weeklyCapacityHours: number
    horizonCapacityHours: number
    horizonAllocatedHours: number
    openTaskHours: number
    projectedHours: number
    utilizationPercent: number
    freeHours: number
    risk: 'healthy' | 'warning' | 'overloaded'
    topProjects: Array<{ projectId: string; projectName: string; hours: number }>
  }>
  focusedMemberId?: string | null
}

function riskBadge(risk: 'healthy' | 'warning' | 'overloaded') {
  if (risk === 'overloaded') return <Badge variant="destructive">Sobrecarga</Badge>
  if (risk === 'warning') return <Badge variant="secondary">Atencao</Badge>
  return <Badge variant="outline">Saudavel</Badge>
}

export function CapacityPlanningPanel({
  horizonWeeks,
  weekStart,
  weekEnd,
  overloadedCount,
  warningCount,
  teamUtilization,
  people,
  focusedMemberId,
}: CapacityPlanningPanelProps) {
  const visiblePeople = focusedMemberId
    ? people.filter((person) => person.userId === focusedMemberId)
    : people

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Janela de planejamento</CardDescription>
            <CardTitle>{horizonWeeks} semanas</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {weekStart} ate {weekEnd}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Utilizacao do time</CardDescription>
            <CardTitle>{teamUtilization.toFixed(1)}%</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Projecao por capacidade declarada e tarefas abertas
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Risco de capacidade</CardDescription>
            <CardTitle>
              {overloadedCount} sobrecarga / {warningCount} atencao
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Pessoas acima de 100% ou acima de 85%
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Capacity planning por pessoa</CardTitle>
          <CardDescription>
            Projecao = max(horas alocadas na capacidade, horas abertas nas tarefas)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {visiblePeople.map((person) => (
            <div key={person.userId} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{person.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    Capacidade semanal media: {person.weeklyCapacityHours.toFixed(1)}h
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {riskBadge(person.risk)}
                  <span className="text-sm font-medium">{person.utilizationPercent.toFixed(1)}%</span>
                </div>
              </div>

              <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-4">
                <p>Capacidade janela: {person.horizonCapacityHours.toFixed(1)}h</p>
                <p>Alocado (cadastro): {person.horizonAllocatedHours.toFixed(1)}h</p>
                <p>Tarefas abertas: {person.openTaskHours.toFixed(1)}h</p>
                <p className={person.freeHours < 0 ? 'text-red-500' : ''}>
                  Folga: {person.freeHours.toFixed(1)}h
                </p>
              </div>

              {person.topProjects.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {person.topProjects.map((project) => (
                    <Badge key={project.projectId} variant="outline">
                      {project.projectName}: {project.hours.toFixed(1)}h
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}

          {visiblePeople.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum membro admin encontrado para planejar capacidade.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
