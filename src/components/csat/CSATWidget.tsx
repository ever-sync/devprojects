'use client'

import { useState, useTransition } from 'react'
import { submitCSATResponse } from '@/actions/csat'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, Star, ThumbsUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CSATWidgetProps {
  token: string
  type: 'csat' | 'nps'
  alreadyAnswered: boolean
}

export function CSATWidget({ token, type, alreadyAnswered }: CSATWidgetProps) {
  const [isPending, startTransition] = useTransition()
  const [score, setScore] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(alreadyAnswered)

  const isNps = type === 'nps'
  const maxScore = 10
  const scores = isNps ? Array.from({ length: 11 }, (_, i) => i) : [1, 2, 3, 4, 5]

  function scoreLabel(s: number) {
    if (isNps) {
      if (s >= 9) return 'Promotor'
      if (s >= 7) return 'Neutro'
      return 'Detrator'
    }
    return ['', 'Péssimo', 'Ruim', 'Regular', 'Bom', 'Excelente'][s] ?? ''
  }

  function scoreColor(s: number) {
    if (isNps) {
      if (s >= 9) return 'bg-green-500 text-white'
      if (s >= 7) return 'bg-yellow-400 text-white'
      return 'bg-red-500 text-white'
    }
    return s >= 4 ? 'bg-green-500 text-white' : s >= 3 ? 'bg-yellow-400 text-white' : 'bg-red-500 text-white'
  }

  function handleSubmit() {
    if (score === null) return
    startTransition(async () => {
      const result = await submitCSATResponse(token, score, comment || undefined)
      if (result.error) return
      setSubmitted(true)
    })
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-4">
        <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto" />
        <h2 className="text-xl font-bold">Obrigado pelo feedback!</h2>
        <p className="text-muted-foreground">Sua resposta foi registrada e nos ajuda a melhorar.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-bold">
          {isNps ? 'Você nos recomendaria para um amigo ou colega?' : 'Como avalia nosso trabalho?'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isNps ? 'Selecione uma nota de 0 (nada provável) a 10 (extremamente provável).'
            : 'Selecione sua nota de 1 (péssimo) a 5 (excelente).'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        {scores.map((s) => (
          <button
            key={s}
            onClick={() => setScore(s)}
            className={cn(
              'h-10 w-10 rounded-lg font-semibold text-sm border-2 transition-all',
              score === s
                ? `border-transparent ${scoreColor(s)} scale-110`
                : 'border-border hover:border-primary hover:scale-105'
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {score !== null && (
        <p className="text-center text-sm font-medium text-primary">{scoreLabel(score)}</p>
      )}

      <div className="space-y-2">
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Comentário adicional (opcional)..."
          className="resize-none"
          rows={3}
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={score === null || isPending}
        className="w-full gap-2"
      >
        <ThumbsUp className="h-4 w-4" />
        {isPending ? 'Enviando...' : 'Enviar avaliação'}
      </Button>
    </div>
  )
}
