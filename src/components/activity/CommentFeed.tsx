import { CommentItem } from './CommentItem'
import { AddCommentForm } from './AddCommentForm'
import { EmptyState } from '@/components/shared/EmptyState'
import { MessageSquare } from 'lucide-react'
import type { CommentWithAuthor } from '@/types'

interface CommentFeedProps {
  comments: CommentWithAuthor[]
  projectId: string
  isAdmin: boolean
}

export function CommentFeed({ comments, projectId, isAdmin }: CommentFeedProps) {
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
