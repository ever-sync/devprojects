'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Send, Trash2, Lock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getTaskComments, type CommentWithAuthor } from '@/actions/comments'
import { createComment, deleteComment } from '@/actions/comments'
import { Avatar } from '@/components/shared/Avatar'

interface TaskCommentsProps {
  taskId: string
  projectId: string
  currentUserId: string
  isAdmin: boolean
}

export function TaskComments({ taskId, projectId, currentUserId, isAdmin }: TaskCommentsProps) {
  const [commentState, setCommentState] = useState<{
    taskId: string
    comments: CommentWithAuthor[]
    isLoading: boolean
  }>({
    taskId,
    comments: [],
    isLoading: true,
  })
  const [text, setText] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [isSending, startSending] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const isLoading = commentState.taskId !== taskId || commentState.isLoading
  const comments = commentState.taskId === taskId ? commentState.comments : []

  useEffect(() => {
    let active = true
    getTaskComments(taskId).then((result) => {
      if (!active) return
      setCommentState({
        taskId,
        comments: result.comments ?? [],
        isLoading: false,
      })
    })

    return () => {
      active = false
    }
  }, [taskId])

  useEffect(() => {
    if (!isLoading) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [commentState.comments, isLoading])

  function handleSend() {
    if (!text.trim()) return

    startSending(async () => {
      const result = await createComment(
        projectId,
        { content: text.trim(), is_internal: isInternal },
        taskId
      )

      if (result.error) {
        toast.error(result.error)
        return
      }

      // Reload comments
      const updated = await getTaskComments(taskId)
      setCommentState({
        taskId,
        comments: updated.comments ?? [],
        isLoading: false,
      })
      setText('')
    })
  }

  async function handleDelete(commentId: string) {
    setDeletingId(commentId)
    const result = await deleteComment(commentId, projectId)
    if (result.error) {
      toast.error(result.error)
    } else {
      setCommentState((prev) => ({
        ...prev,
        comments: prev.comments.filter((c) => c.id !== commentId),
      }))
    }
    setDeletingId(null)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Comments list */}
      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Nenhum comentário ainda. Seja o primeiro!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="group flex gap-2.5">
              <div className="shrink-0 mt-0.5">
                <Avatar
                  name={comment.author.full_name}
                  avatarUrl={comment.author.avatar_url}
                  size="sm"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-foreground leading-none">
                    {comment.author.full_name.split(' ')[0]}
                  </span>
                  {comment.is_internal && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-1.5 py-0.5">
                      <Lock className="w-2.5 h-2.5" />
                      Interno
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ptBR })}
                  </span>
                </div>

                <div className={`rounded-lg px-3 py-2 text-sm leading-relaxed ${
                  comment.is_internal
                    ? 'bg-amber-500/8 border border-amber-500/15 text-amber-100/80'
                    : 'bg-muted/50 border border-border/50 text-foreground'
                }`}>
                  {comment.content}
                </div>
              </div>

              {/* Delete button - only for own comments or admin */}
              {(isAdmin || comment.author_id === currentUserId) && (
                <button
                  type="button"
                  onClick={() => handleDelete(comment.id)}
                  disabled={deletingId === comment.id}
                  title="Excluir comentário"
                  className="shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-400"
                >
                  {deletingId === comment.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border border-border rounded-lg overflow-hidden focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escreva um comentário... (Ctrl+Enter para enviar)"
          rows={2}
          disabled={isSending}
          className="w-full px-3 py-2.5 text-sm bg-transparent outline-none resize-none leading-relaxed placeholder:text-muted-foreground disabled:opacity-50"
        />
        <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/20">
          {isAdmin ? (
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-amber-500"
              />
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Interno (só equipe)
              </span>
            </label>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={handleSend}
            disabled={isSending || !text.trim()}
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isSending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Send className="w-3.5 h-3.5" />}
            {isSending ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  )
}
