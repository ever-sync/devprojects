'use client'

import { useState, useCallback } from 'react'
import { CommentItem } from './CommentItem'
import { AddCommentForm } from './AddCommentForm'
import { EmptyState } from '@/components/shared/EmptyState'
import { MessageSquare } from 'lucide-react'
import { useRealtime } from '@/hooks/useRealtime'
import { createClient } from '@/lib/supabase/client'
import type { CommentWithAuthor } from '@/types'

interface ActivityFeedRealtimeProps {
  initialComments: CommentWithAuthor[]
  projectId: string
  isAdmin: boolean
}

export function ActivityFeedRealtime({
  initialComments,
  projectId,
  isAdmin,
}: ActivityFeedRealtimeProps) {
  const [comments, setComments] = useState<CommentWithAuthor[]>(initialComments)

  const handleInsert = useCallback(
    async (row: Record<string, unknown>) => {
      // Fetch full comment with author data
      const supabase = createClient()
      const { data } = await supabase
        .from('comments')
        .select('*, author:profiles!comments_author_id_fkey(id, full_name, avatar_url, role)')
        .eq('id', row.id as string)
        .single()

      if (!data) return

      // Filter internal comments for non-admins
      if (!isAdmin && (data as { is_internal: boolean }).is_internal) return

      setComments((prev) => {
        // Avoid duplicates
        if (prev.some((c) => c.id === data.id)) return prev
        return [data as unknown as CommentWithAuthor, ...prev]
      })
    },
    [isAdmin]
  )

  const handleDelete = useCallback((row: Record<string, unknown>) => {
    setComments((prev) => prev.filter((c) => c.id !== row.id))
  }, [])

  useRealtime({
    table: 'comments',
    filter: `project_id=eq.${projectId}`,
    onInsert: handleInsert,
    onDelete: handleDelete,
  })

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Nova Atualização</h3>
        <AddCommentForm projectId={projectId} isAdmin={isAdmin} />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">
          Histórico ({comments.length})
        </h3>

        {comments.length === 0 ? (
          <EmptyState
            icon={<MessageSquare className="w-10 h-10" />}
            title="Nenhuma atualização ainda"
            description="As atualizações do projeto aparecerão aqui."
          />
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} isAdmin={isAdmin} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
