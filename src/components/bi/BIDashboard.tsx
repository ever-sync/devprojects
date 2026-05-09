'use client'

import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatBRLValue } from '@/lib/currency'
import { TrendingUp, Clock, FolderKanban, CheckSquare, AlertTriangle, DollarSign } from 'lucide-react'
import type { BIData } from '@/actions/bi'

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6']

const HEALTH_COLORS = { green: '#22c55e', yellow: '#f59e0b', red: '#ef4444' }
const STATUS_COLORS = { active: '#6366f1', completed: '#22c55e', paused: '#94a3b8' }

function KPICard({ title, value, sub, icon: Icon, color = 'text-primary' }: {
  title: string; value: string; sub?: string; icon: React.ElementType; color?: string
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`rounded-lg p-2 bg-primary/10 ${color}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface BIDashboardProps {
  data: BIData
  months: number
}

export function BIDashboard({ data, months }: BIDashboardProps) {
  const { kpis, revenueChart, topProjectsByHours, teamPerformance, projectsByStatus, projectsByHealth } = data

  const healthData = [
    { name: 'Saudável', value: projectsByHealth.green, color: HEALTH_COLORS.green },
    { name: 'Atenção', value: projectsByHealth.yellow, color: HEALTH_COLORS.yellow },
    { name: 'Crítico', value: projectsByHealth.red, color: HEALTH_COLORS.red },
  ].filter((d) => d.value > 0)

  const statusData = [
    { name: 'Ativo', value: projectsByStatus.active, color: STATUS_COLORS.active },
    { name: 'Concluído', value: projectsByStatus.completed, color: STATUS_COLORS.completed },
    { name: 'Pausado', value: projectsByStatus.paused, color: STATUS_COLORS.paused },
  ].filter((d) => d.value > 0)

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard title="Faturado" value={formatBRLValue(kpis.totalInvoiced)} icon={DollarSign} />
        <KPICard title="Recebido" value={formatBRLValue(kpis.totalPaid)} icon={TrendingUp} color="text-green-600" />
        <KPICard title="Margem Bruta" value={kpis.grossMargin !== null ? `${kpis.grossMargin}%` : '—'} icon={TrendingUp}
          color={kpis.grossMargin !== null ? (kpis.grossMargin >= 40 ? 'text-green-600' : kpis.grossMargin >= 20 ? 'text-yellow-600' : 'text-red-600') : 'text-muted-foreground'} />
        <KPICard title="Horas Logadas" value={`${kpis.totalHours.toFixed(0)}h`} icon={Clock} />
        <KPICard title="Projetos Ativos" value={String(kpis.activeProjects)} icon={FolderKanban} />
        <KPICard title="Tasks Atrasadas" value={String(kpis.tasksOverdue)} icon={AlertTriangle}
          color={kpis.tasksOverdue > 0 ? 'text-red-600' : 'text-green-600'} />
      </div>

      {/* Revenue Chart */}
      {revenueChart.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Receita por mês</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueChart} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Tooltip formatter={(v: any) => formatBRLValue(Number(v))} />
                <Legend />
                <Bar dataKey="invoiced" name="Faturado" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="paid" name="Recebido" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Projetos */}
        {topProjectsByHours.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Top projetos por horas</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topProjectsByHours} layout="vertical" margin={{ left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} />
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}h`} />
                  <Bar dataKey="hours" name="Horas" radius={[0, 4, 4, 0]}>
                    {topProjectsByHours.map((_: unknown, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Saúde dos Projetos */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Saúde</CardTitle></CardHeader>
            <CardContent>
              {healthData.length > 0 ? (
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={healthData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                      {healthData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-muted-foreground py-8 text-center">Sem dados</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Status</CardTitle></CardHeader>
            <CardContent>
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value">
                      {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-muted-foreground py-8 text-center">Sem dados</p>}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Team Performance */}
      {teamPerformance.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Performance da equipe</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 text-left font-medium text-muted-foreground">Pessoa</th>
                    <th className="pb-2 text-right font-medium text-muted-foreground">Horas</th>
                    <th className="pb-2 text-right font-medium text-muted-foreground">Receita Gerada</th>
                    <th className="pb-2 text-right font-medium text-muted-foreground">Custo</th>
                    <th className="pb-2 text-right font-medium text-muted-foreground">Margem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {teamPerformance.map((p) => {
                    const margin = p.revenue > 0 ? Math.round(((p.revenue - p.cost) / p.revenue) * 100) : null
                    return (
                      <tr key={p.id} className="hover:bg-muted/20">
                        <td className="py-2.5 font-medium">{p.name}</td>
                        <td className="py-2.5 text-right text-muted-foreground">{p.hours.toFixed(1)}h</td>
                        <td className="py-2.5 text-right">{formatBRLValue(p.revenue)}</td>
                        <td className="py-2.5 text-right text-muted-foreground">{formatBRLValue(p.cost)}</td>
                        <td className="py-2.5 text-right">
                          {margin !== null ? (
                            <Badge className={`text-xs ${margin >= 40 ? 'bg-green-500/10 text-green-600' : margin >= 20 ? 'bg-yellow-500/10 text-yellow-600' : 'bg-red-500/10 text-red-600'}`}>
                              {margin}%
                            </Badge>
                          ) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
