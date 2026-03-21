'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getTasksForExport } from '@/actions/tasks'
import { TASK_STATUS_LABELS, TASK_PRIORITY_CONFIG } from '@/lib/constants'
import { format } from 'date-fns'

interface ExportTasksButtonProps {
  projectId: string
  projectName: string
}

export function ExportTasksButton({ projectId, projectName }: ExportTasksButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    try {
      const result = await getTasksForExport(projectId)
      if (result.error || !result.tasks) {
        toast.error(result.error ?? 'Erro ao exportar')
        return
      }

      const headers = ['Título', 'Status', 'Prioridade', 'Responsável', 'Tipo', 'Data de Entrega', 'Descrição']

      const rows = result.tasks.map((task) => {
        const assignee = (task.assignee as unknown as { full_name: string } | null)?.full_name ?? ''
        const status = TASK_STATUS_LABELS[task.status] ?? task.status
        const priority = TASK_PRIORITY_CONFIG[task.priority]?.label ?? task.priority
        const ownerType = task.owner_type === 'client' ? 'Cliente' : 'Equipe'
        const dueDate = task.due_date ? format(new Date(task.due_date), 'dd/MM/yyyy') : ''
        const description = (task.description ?? '').replace(/"/g, '""').replace(/\n/g, ' ')
        const title = task.title.replace(/"/g, '""')

        return [
          `"${title}"`,
          `"${status}"`,
          `"${priority}"`,
          `"${assignee}"`,
          `"${ownerType}"`,
          `"${dueDate}"`,
          `"${description}"`,
        ].join(',')
      })

      const csv = [headers.join(','), ...rows].join('\n')
      const bom = '\uFEFF' // UTF-8 BOM for Excel compatibility
      const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = `tarefas-${projectName.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.csv`
      a.click()
      URL.revokeObjectURL(url)

      toast.success(`${result.tasks.length} tarefas exportadas`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={handleExport} disabled={loading}>
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
      ) : (
        <Download className="w-3.5 h-3.5 mr-1.5" />
      )}
      Exportar CSV
    </Button>
  )
}
