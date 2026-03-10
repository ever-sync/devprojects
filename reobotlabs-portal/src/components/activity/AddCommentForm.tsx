'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { commentSchema, type CommentInput } from '@/lib/validations'
import { createComment } from '@/actions/comments'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Lock, Globe } from 'lucide-react'

interface AddCommentFormProps {
  projectId: string
  isAdmin: boolean
}

export function AddCommentForm({ projectId, isAdmin }: AddCommentFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isInternal, setIsInternal] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CommentInput>({
    resolver: zodResolver(commentSchema),
    defaultValues: { is_internal: false },
  })

  async function onSubmit(data: CommentInput) {
    setIsLoading(true)
    const result = await createComment(projectId, { ...data, is_internal: isInternal })
    if (!result?.error) {
      reset()
      setIsInternal(false)
    }
    setIsLoading(false)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <Textarea
        placeholder={
          isAdmin
            ? isInternal
              ? 'Nota interna (apenas a equipe verá)...'
              : 'Escreva uma atualização para o cliente...'
            : 'Escreva uma mensagem...'
        }
        rows={3}
        {...register('content')}
        className={isInternal ? 'border-amber-500/30 bg-amber-500/10' : ''}
      />
      {errors.content && <p className="text-sm text-red-400">{errors.content.message}</p>}

      <div className="flex items-center justify-between gap-3">
        {isAdmin && (
          <button
            type="button"
            onClick={() => setIsInternal(!isInternal)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
              isInternal
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                : 'bg-secondary border-border text-muted-foreground hover:bg-secondary/80'
            }`}
          >
            {isInternal ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
            {isInternal ? 'Nota interna' : 'Visível ao cliente'}
          </button>
        )}

        <Button type="submit" size="sm" disabled={isLoading} className="ml-auto">
          {isLoading ? 'Enviando...' : 'Enviar'}
        </Button>
      </div>
    </form>
  )
}
