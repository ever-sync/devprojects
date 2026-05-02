'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Copy, Sparkles } from 'lucide-react'
import { generateDailyStandup } from '@/actions/standup'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function DailyStandupCard() {
  const [standup, setStandup] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateDailyStandup()
      if (result.error) {
        toast.error(result.error)
        return
      }
      setStandup(result.standup ?? '')
      toast.success('Standup diário gerado.')
    })
  }

  async function handleCopy() {
    if (!standup.trim()) return
    await navigator.clipboard.writeText(standup)
    toast.success('Standup copiado.')
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Daily Standup Automático</CardTitle>
        <Sparkles className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Button type="button" onClick={handleGenerate} disabled={isPending}>
            {isPending ? 'Gerando...' : 'Gerar standup'}
          </Button>
          <Button type="button" variant="outline" onClick={handleCopy} disabled={!standup.trim()}>
            <Copy className="mr-2 h-4 w-4" />
            Copiar
          </Button>
        </div>
        <pre className="min-h-[220px] whitespace-pre-wrap rounded-xl border border-border bg-muted/30 p-3 text-xs leading-5 text-foreground">
          {standup || 'Clique em "Gerar standup" para montar o resumo automático do dia.'}
        </pre>
      </CardContent>
    </Card>
  )
}
