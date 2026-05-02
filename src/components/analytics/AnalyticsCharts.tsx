'use client'

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface AnalyticsChartsProps {
  statusCounts: Record<string, number>
  projectsByType: Record<string, number>
  healthDistribution: Record<string, number>
  forecastDistribution: {
    onTrack: number
    minorRisk: number
    majorRisk: number
  }
  burndown: Array<{
    date: string
    remainingHours: number
    idealRemainingHours: number
  }>
  velocity: Array<{
    weekStart: string
    completedHours: number
  }>
}

const PIE_COLORS = ['#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#14B8A6', '#FB7185']
const HEALTH_COLORS: Record<string, string> = {
  green: '#10B981',
  yellow: '#F59E0B',
  red: '#EF4444',
}

const STATUS_MAP: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'Fazendo',
  review: 'Revisao',
  done: 'Concluido',
}

const TYPE_MAP: Record<string, string> = {
  saas: 'SaaS',
  automation: 'Automacao',
  ai_agent: 'Agente IA',
}

const HEALTH_MAP: Record<string, string> = {
  green: 'Saudavel',
  yellow: 'Atencao',
  red: 'Critico',
}

export function AnalyticsCharts({
  statusCounts,
  projectsByType,
  healthDistribution,
  forecastDistribution,
  burndown,
  velocity,
}: AnalyticsChartsProps) {
  const statusData = Object.entries(statusCounts).map(([status, count]) => ({
    name: STATUS_MAP[status] || status,
    count,
  }))

  const typeData = Object.entries(projectsByType).map(([type, value]) => ({
    name: TYPE_MAP[type] || type,
    value,
  }))

  const healthData = Object.entries(healthDistribution).map(([band, value]) => ({
    name: HEALTH_MAP[band] || band,
    value,
    color: HEALTH_COLORS[band] || '#94A3B8',
  }))

  const forecastData = [
    { name: 'No prazo', count: forecastDistribution.onTrack, fill: '#10B981' },
    { name: 'Risco leve', count: forecastDistribution.minorRisk, fill: '#F59E0B' },
    { name: 'Risco alto', count: forecastDistribution.majorRisk, fill: '#EF4444' },
  ]

  const burndownData = burndown.map((point) => ({
    ...point,
    label: point.date.slice(5),
  }))

  const velocityData = velocity.map((point) => ({
    ...point,
    label: point.weekStart.slice(5),
  }))

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Card className="bg-card border-border shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Distribuicao de tarefas por status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full rounded-xl bg-white">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(15, 23, 42, 0.12)" />
                <XAxis dataKey="name" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(14, 165, 233, 0.08)' }}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="count" fill="#06B6D4" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Projetos por tipo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full rounded-xl bg-white">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {typeData.map((entry, index) => (
                    <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-4">
            {typeData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                />
                <span className="text-xs text-muted-foreground">{entry.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Health score dos projetos ativos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full rounded-xl bg-white">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={healthData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={6}
                  dataKey="value"
                >
                  {healthData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-4">
            {healthData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-xs text-muted-foreground">{entry.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Forecast de entrega</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full rounded-xl bg-white">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(15, 23, 42, 0.12)" />
                <XAxis dataKey="name" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(14, 165, 233, 0.08)' }}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {forecastData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Burndown (horas restantes)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full rounded-xl bg-white">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={burndownData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(15, 23, 42, 0.12)" />
                <XAxis dataKey="label" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    borderRadius: '8px',
                  }}
                />
                <Line type="monotone" dataKey="remainingHours" stroke="#0EA5E9" strokeWidth={2} dot={false} name="Real" />
                <Line type="monotone" dataKey="idealRemainingHours" stroke="#94A3B8" strokeWidth={2} dot={false} strokeDasharray="4 4" name="Ideal" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Velocity semanal (horas concluídas)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full rounded-xl bg-white">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={velocityData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(15, 23, 42, 0.12)" />
                <XAxis dataKey="label" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="completedHours" fill="#14B8A6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
