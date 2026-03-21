'use client'

import { AlertCircle, CheckCircle2, Clock, History, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TASK_STATUS_LABELS } from '@/lib/constants'
import type { TaskWithAssignee } from '@/types'

interface ProductivityReportProps {
  tasks: TaskWithAssignee[]
  metrics: {
    loggedHours: number
    approvedHours: number
    pendingApprovals: number
    baselineHours: number | null
    contractValue: number | null
    marginPercent: number | null
    internalCost: number
    recognizedRevenue: number
    grossMargin: number
    marginPercentReal: number | null
  }
}

function formatCurrency(value: number | null) {
  if (value == null) return '-'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value)
}

export function ProductivityReport({ tasks, metrics }: ProductivityReportProps) {
  const tasksWithTime = tasks.filter((task) => (task.estimated_hours ?? 0) > 0 || (task.actual_hours ?? 0) > 0)

  const totalEstimated = tasksWithTime.reduce((acc, task) => acc + (task.estimated_hours ?? 0), 0)
  const totalActual = tasksWithTime.reduce((acc, task) => acc + (task.actual_hours ?? 0), 0)
  const difference = totalEstimated - totalActual
  const efficiency = totalActual > 0 ? Math.round((totalEstimated / totalActual) * 100) : 0
  const baselineGap = metrics.baselineHours != null ? metrics.baselineHours - metrics.loggedHours : null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
            <Clock className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total estimado</p>
            <p className="text-xl font-bold">{totalEstimated}h</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10">
            <History className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total realizado</p>
            <p className="text-xl font-bold">{totalActual}h</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Horas aprovadas</p>
            <p className="text-xl font-bold">{metrics.approvedHours.toFixed(1)}h</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${difference >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
            {difference >= 0 ? <TrendingUp className="h-5 w-5 text-green-500" /> : <TrendingDown className="h-5 w-5 text-red-500" />}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Saldo / eficiencia</p>
            <p className={`text-xl font-bold ${difference >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {difference > 0 ? `+${difference}` : difference}h ({efficiency}%)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Contrato / margem</p>
            <p className="text-base font-bold">{formatCurrency(metrics.contractValue)}</p>
            <p className="text-xs text-muted-foreground">
              Meta {metrics.marginPercent != null ? `${metrics.marginPercent}%` : '-'} • Real {metrics.marginPercentReal != null ? `${metrics.marginPercentReal.toFixed(1)}%` : '-'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
            <AlertCircle className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Baseline / aprovacoes</p>
            <p className="text-base font-bold">
              {baselineGap == null ? '-' : `${baselineGap > 0 ? '+' : ''}${baselineGap.toFixed(1)}h`}
            </p>
            <p className="text-xs text-muted-foreground">{metrics.pendingApprovals} pendentes</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Custo interno</p>
          <p className="mt-2 text-xl font-bold text-foreground">{formatCurrency(metrics.internalCost)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Receita reconhecida</p>
          <p className="mt-2 text-xl font-bold text-foreground">{formatCurrency(metrics.recognizedRevenue)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Margem bruta</p>
          <p className={`mt-2 text-xl font-bold ${metrics.grossMargin >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {formatCurrency(metrics.grossMargin)}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tarefa</TableHead>
              <TableHead>Responsavel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Est. (h)</TableHead>
              <TableHead className="text-right">Real. (h)</TableHead>
              <TableHead className="text-right">Var.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasksWithTime.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Nenhuma tarefa com horas registradas neste projeto.
                </TableCell>
              </TableRow>
            ) : (
              tasksWithTime.map((task) => {
                const diff = (task.estimated_hours ?? 0) - (task.actual_hours ?? 0)
                return (
                  <TableRow key={task.id}>
                    <TableCell className="max-w-[300px] truncate font-medium">
                      {task.title}
                    </TableCell>
                    <TableCell>{task.assignee?.full_name ?? '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {TASK_STATUS_LABELS[task.status] ?? task.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{task.estimated_hours ?? 0}h</TableCell>
                    <TableCell className="text-right">{task.actual_hours ?? 0}h</TableCell>
                    <TableCell className={`text-right font-medium ${diff >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {diff > 0 ? `+${diff}` : diff}h
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-blue-600 dark:text-blue-400">
        <AlertCircle className="h-4 w-4" />
        <p>
          Metricas combinam horas estimadas, horas registradas, baseline comercial e pendencias de aprovacao.
        </p>
      </div>
    </div>
  )
}
