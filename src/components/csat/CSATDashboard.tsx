'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { sendCSATRequest } from '@/actions/csat'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Send, TrendingUp, Users, Star } from 'lucide-react'
import type { CSATResponse } from '@/actions/csat'

interface CSATDashboardProps {
  data: {
    responses: CSATResponse[]
    npsScore: number | null
    csatAvg: number | null
  } | null
}

function NPSGauge({ score }: { score: number }) {
  const color = score >= 50 ? 'text-green-500' : score >= 0 ? 'text-yellow-500' : 'text-red-500'
  const label = score >= 50 ? 'Excelente' : score >= 0 ? 'Bom' : 'Precisa melhorar'
  return (
    <div className="text-center">
      <div className={`text-5xl font-bold ${color}`}>{score > 0 ? '+' : ''}{score}</div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </div>
  )
}

export function CSATDashboard({ data }: CSATDashboardProps) {
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [projectId, setProjectId] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState<'csat' | 'nps'>('csat')

  function handleSend() {
    if (!projectId || !email || !name) { toast.error('Preencha todos os campos.'); return }
    startTransition(async () => {
      const result = await sendCSATRequest({ projectId, clientEmail: email, clientName: name, type })
      if (result.error) { toast.error(result.error); return }
      toast.success('Pesquisa enviada por email!')
      setOpen(false); setProjectId(''); setEmail(''); setName('')
    })
  }

  const responses = data?.responses ?? []
  const answered = responses.filter((r) => r.answered_at)
  const pending = responses.filter((r) => !r.answered_at)
  const responseRate = responses.length ? Math.round((answered.length / responses.length) * 100) : 0

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <div className="text-3xl font-bold">{data?.npsScore !== null && data?.npsScore !== undefined ? (data.npsScore > 0 ? '+' : '') + data.npsScore : '—'}</div>
          <div className="text-xs text-muted-foreground mt-1">NPS</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <div className="text-3xl font-bold">{data?.csatAvg !== null && data?.csatAvg !== undefined ? `${data.csatAvg}/5` : '—'}</div>
          <div className="text-xs text-muted-foreground mt-1">CSAT Médio</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <div className="text-3xl font-bold">{responseRate}%</div>
          <div className="text-xs text-muted-foreground mt-1">Taxa de Resposta</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <div className="text-3xl font-bold">{answered.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Respostas</div>
        </div>
      </div>

      {/* Ações */}
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Send className="h-4 w-4" />Enviar pesquisa</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Enviar CSAT / NPS</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <div className="flex gap-2">
                  {(['csat', 'nps'] as const).map((t) => (
                    <button key={t} onClick={() => setType(t)}
                      className={`flex-1 rounded-lg border-2 py-2 text-sm font-medium transition-colors ${type === t ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}>
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>ID do projeto</Label>
                <Input value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="UUID do projeto" />
              </div>
              <div className="space-y-2">
                <Label>Nome do cliente</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="João Silva" />
              </div>
              <div className="space-y-2">
                <Label>Email do cliente</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="joao@empresa.com" />
              </div>
              <Button onClick={handleSend} disabled={isPending} className="w-full">
                {isPending ? 'Enviando...' : 'Enviar pesquisa'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de respostas */}
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Respondente</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Projeto</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Tipo</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nota</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Comentário</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Quando</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {answered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nenhuma resposta ainda.</td></tr>
            )}
            {answered.map((r) => {
              const scoreColor = r.type === 'nps'
                ? r.score >= 9 ? 'text-green-600' : r.score >= 7 ? 'text-yellow-600' : 'text-red-600'
                : r.score >= 4 ? 'text-green-600' : r.score >= 3 ? 'text-yellow-600' : 'text-red-600'
              return (
                <tr key={r.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">{r.respondent ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.project?.name ?? '—'}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{r.type.toUpperCase()}</Badge></td>
                  <td className={`px-4 py-3 font-bold ${scoreColor}`}>{r.score}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{r.comment ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {r.answered_at ? formatDistanceToNow(new Date(r.answered_at), { addSuffix: true, locale: ptBR }) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
