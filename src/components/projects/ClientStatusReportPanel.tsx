'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Send, FileText, Sparkles, Trash2, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  generateStatusReport,
  saveStatusReport,
  markReportSent,
  deleteStatusReport,
} from '@/actions/client-status-report'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type Report = {
  id: string
  title: string
  period_start: string
  period_end: string
  content_markdown: string
  highlights: string[] | null
  blockers: string[] | null
  next_steps: string[] | null
  status: string
  sent_at: string | null
  sent_to: string[] | null
  created_at: string
}

interface Props {
  projectId: string
  projectName: string
  reports: Report[]
}

export function ClientStatusReportPanel({ projectId, projectName, reports: initialReports }: Props) {
  const [reports, setReports] = useState(initialReports)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showGenerate, setShowGenerate] = useState(false)
  const [showSend, setShowSend] = useState<string | null>(null)
  const [showDelete, setShowDelete] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [sendEmails, setSendEmails] = useState('')

  const [generateForm, setGenerateForm] = useState({
    periodStart: format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    periodEnd: format(new Date(), 'yyyy-MM-dd'),
    customInstructions: '',
  })

  const [generatedReport, setGeneratedReport] = useState<{
    contentMarkdown: string
    highlights: string[]
    blockers: string[]
    nextSteps: string[]
    title: string
  } | null>(null)

  async function handleGenerate() {
    setGenerating(true)
    const result = await generateStatusReport({
      projectId,
      periodStart: generateForm.periodStart,
      periodEnd: generateForm.periodEnd,
      customInstructions: generateForm.customInstructions || undefined,
    })
    setGenerating(false)

    if (result.error || !result.data) {
      toast.error(result.error ?? 'Erro ao gerar relatório')
      return
    }

    const start = format(new Date(generateForm.periodStart), 'dd/MM', { locale: ptBR })
    const end = format(new Date(generateForm.periodEnd), 'dd/MM/yyyy', { locale: ptBR })
    setGeneratedReport({
      contentMarkdown: result.data.contentMarkdown,
      highlights: result.data.highlights,
      blockers: result.data.blockers,
      nextSteps: result.data.nextSteps,
      title: `Status Report — ${projectName} — ${start} a ${end}`,
    })
  }

  function handleSaveReport() {
    if (!generatedReport) return
    startTransition(async () => {
      const result = await saveStatusReport({
        projectId,
        title: generatedReport.title,
        periodStart: generateForm.periodStart,
        periodEnd: generateForm.periodEnd,
        contentMarkdown: generatedReport.contentMarkdown,
        highlights: generatedReport.highlights,
        blockers: generatedReport.blockers,
        nextSteps: generatedReport.nextSteps,
      })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Relatório salvo')
        setReports(prev => [result.data!, ...prev])
        setShowGenerate(false)
        setGeneratedReport(null)
      }
    })
  }

  function handleMarkSent(id: string) {
    const emails = sendEmails.split(',').map(e => e.trim()).filter(Boolean)
    if (emails.length === 0) {
      toast.error('Informe ao menos um email')
      return
    }
    startTransition(async () => {
      const result = await markReportSent(id, emails)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Relatório marcado como enviado')
        setReports(prev => prev.map(r => r.id === id ? { ...r, status: 'sent', sent_to: emails, sent_at: new Date().toISOString() } : r))
        setShowSend(null)
        setSendEmails('')
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteStatusReport(id, projectId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Relatório removido')
        setReports(prev => prev.filter(r => r.id !== id))
        setShowDelete(null)
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Relatórios de Status</h2>
          <p className="text-sm text-muted-foreground">
            Gere e envie relatórios periódicos para o cliente
          </p>
        </div>
        <Button onClick={() => setShowGenerate(true)} size="sm">
          <Sparkles className="w-4 h-4 mr-1" />
          Gerar Relatório
        </Button>
      </div>

      {/* Lista de relatórios */}
      {reports.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Nenhum relatório gerado ainda.</p>
          <p className="text-sm">Clique em "Gerar Relatório" para criar o primeiro.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((report) => (
            <div key={report.id} className="rounded-lg border bg-card">
              <div
                className="flex items-center justify-between p-4 cursor-pointer"
                onClick={() => setExpandedId(expandedId === report.id ? null : report.id)}
              >
                <div className="flex items-center gap-3">
                  <Badge variant={report.status === 'sent' ? 'default' : 'secondary'}>
                    {report.status === 'sent' ? (
                      <><CheckCircle className="w-3 h-3 mr-1" />Enviado</>
                    ) : 'Rascunho'}
                  </Badge>
                  <span className="font-medium text-sm">{report.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {format(new Date(report.created_at), 'dd/MM/yy', { locale: ptBR })}
                  </span>
                  {expandedId === report.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>

              {expandedId === report.id && (
                <div className="border-t px-4 pb-4 space-y-4">
                  {/* Período */}
                  <p className="text-xs text-muted-foreground pt-3">
                    Período: {format(new Date(report.period_start), 'dd/MM/yyyy', { locale: ptBR })} → {format(new Date(report.period_end), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>

                  {/* Bullets */}
                  {(report.highlights ?? []).length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Destaques</p>
                      <ul className="text-sm space-y-0.5">
                        {(report.highlights ?? []).map((h, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-green-500">✓</span>
                            {h}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(report.blockers ?? []).length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Bloqueios</p>
                      <ul className="text-sm space-y-0.5">
                        {(report.blockers ?? []).map((b, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-red-400">!</span>
                            {b}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Conteúdo completo */}
                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted-foreground text-xs hover:text-foreground">Ver conteúdo completo</summary>
                    <pre className="mt-2 whitespace-pre-wrap text-sm bg-muted p-3 rounded max-h-60 overflow-y-auto">
                      {report.content_markdown}
                    </pre>
                  </details>

                  {/* Enviado para */}
                  {report.sent_to && report.sent_to.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Enviado para: {report.sent_to.join(', ')}
                      {report.sent_at && ` em ${format(new Date(report.sent_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`}
                    </p>
                  )}

                  {/* Ações */}
                  <div className="flex gap-2">
                    {report.status === 'draft' && (
                      <Button size="sm" onClick={() => setShowSend(report.id)}>
                        <Send className="w-3 h-3 mr-1" />
                        Marcar como Enviado
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setShowDelete(report.id)}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Excluir
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Dialog: gerar relatório */}
      <Dialog open={showGenerate} onOpenChange={(v) => { setShowGenerate(v); if (!v) setGeneratedReport(null) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerar Relatório de Status</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Início do período</Label>
                <Input
                  type="date"
                  value={generateForm.periodStart}
                  onChange={(e) => setGenerateForm(p => ({ ...p, periodStart: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Fim do período</Label>
                <Input
                  type="date"
                  value={generateForm.periodEnd}
                  onChange={(e) => setGenerateForm(p => ({ ...p, periodEnd: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Instruções adicionais (opcional)</Label>
              <Textarea
                rows={2}
                placeholder="Ex: Mencione que a entrega do módulo X foi antecipada..."
                value={generateForm.customInstructions}
                onChange={(e) => setGenerateForm(p => ({ ...p, customInstructions: e.target.value }))}
              />
            </div>

            {!generatedReport && (
              <Button onClick={handleGenerate} disabled={generating} className="w-full">
                {generating ? (
                  <><span className="animate-spin mr-2">⟳</span>Gerando com IA...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-1" />Gerar com IA</>
                )}
              </Button>
            )}

            {generatedReport && (
              <div className="space-y-3 border rounded-lg p-4 bg-muted/40">
                <div className="space-y-1">
                  <Label>Título</Label>
                  <Input
                    value={generatedReport.title}
                    onChange={(e) => setGeneratedReport(p => p ? { ...p, title: e.target.value } : p)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Conteúdo gerado</Label>
                  <Textarea
                    rows={12}
                    value={generatedReport.contentMarkdown}
                    onChange={(e) => setGeneratedReport(p => p ? { ...p, contentMarkdown: e.target.value } : p)}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleGenerate} disabled={generating} size="sm">
                    Regenerar
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowGenerate(false); setGeneratedReport(null) }}>
              Cancelar
            </Button>
            {generatedReport && (
              <Button onClick={handleSaveReport} disabled={isPending}>
                Salvar Relatório
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: marcar como enviado */}
      <Dialog open={!!showSend} onOpenChange={() => setShowSend(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar como Enviado</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Registre para quem o relatório foi enviado (fora do sistema).
          </p>
          <div className="space-y-1">
            <Label>Emails (separados por vírgula)</Label>
            <Input
              placeholder="cliente@email.com, gerente@empresa.com"
              value={sendEmails}
              onChange={(e) => setSendEmails(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSend(null)}>Cancelar</Button>
            <Button onClick={() => showSend && handleMarkSent(showSend)} disabled={isPending}>
              <Send className="w-3 h-3 mr-1" />
              Confirmar Envio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert: excluir */}
      <AlertDialog open={!!showDelete} onOpenChange={() => setShowDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir relatório?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => showDelete && handleDelete(showDelete)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
