'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, CheckCircle2, Edit2, Trash2, Reply, AtSign } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  createCommentThread,
  updateCommentThread,
  deleteCommentThread,
  resolveCommentThread,
  getCommentThreads,
  type CommentThreadInput,
} from '@/actions/collaboration-ux'

interface Comment {
  id: string
  content: string
  created_at: string
  updated_at: string
  edited: boolean
  resolved: boolean
  author: {
    id: string
    email: string
    raw_user_meta_data?: {
      full_name?: string
      avatar_url?: string
    }
  } | null
  resolver?: {
    id: string
    email: string
  } | null
  replies?: Comment[]
  mentions?: Array<{
    mentioned_user: {
      id: string
      email: string
    }
  }>
}

interface CommentThreadProps {
  taskId?: string
  documentId?: string
  workspaceId: string
}

export function CommentThread({ taskId, documentId, workspaceId }: CommentThreadProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  useEffect(() => {
    loadComments()
  }, [taskId, documentId])

  async function loadComments() {
    setLoading(true)
    const result = await getCommentThreads(taskId, documentId)
    if (result.success && result.data) {
      // Filter only top-level comments (no parent)
      const topLevelComments = result.data.filter((c: Comment) => !c.parent_comment_id)
      setComments(topLevelComments)
    }
    setLoading(false)
  }

  async function handleCreateComment(parentCommentId?: string) {
    if (!newComment.trim()) return

    const input: CommentThreadInput = {
      taskId,
      documentId,
      parentCommentId,
      content: newComment.trim(),
      workspaceId,
    }

    const result = await createCommentThread(input)
    if (result.success) {
      setNewComment('')
      setReplyingTo(null)
      await loadComments()
    }
  }

  async function handleUpdateComment(commentId: string) {
    if (!editContent.trim()) return

    const result = await updateCommentThread(commentId, editContent.trim())
    if (result.success) {
      setEditingId(null)
      setEditContent('')
      await loadComments()
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!confirm('Tem certeza que deseja excluir este comentário?')) return

    const result = await deleteCommentThread(commentId)
    if (result.success) {
      await loadComments()
    }
  }

  async function handleResolveComment(commentId: string, resolved: boolean) {
    const result = await resolveCommentThread({ commentId, resolved })
    if (result.success) {
      await loadComments()
    }
  }

  function startEditing(comment: Comment) {
    setEditingId(comment.id)
    setEditContent(comment.content)
  }

  return (
    <div className="space-y-4">
      {/* New Comment */}
      <div className="flex gap-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <Textarea
            placeholder="Adicione um comentário..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[80px]"
          />
          <div className="flex justify-between items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNewComment((prev) => prev + '@')}
            >
              <AtSign className="h-4 w-4 mr-1" />
              Mencionar
            </Button>
            <Button
              onClick={() => handleCreateComment()}
              disabled={!newComment.trim()}
            >
              Comentar
            </Button>
          </div>
        </div>
      </div>

      {/* Comments List */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Carregando comentários...
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum comentário ainda. Seja o primeiro!
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onReply={() => setReplyingTo(comment.id)}
              onEdit={() => startEditing(comment)}
              onDelete={() => handleDeleteComment(comment.id)}
              onResolve={() => handleResolveComment(comment.id, !comment.resolved)}
              isReplying={replyingTo === comment.id}
              isEditing={editingId === comment.id}
              editContent={editContent}
              setEditContent={setEditContent}
              onSaveEdit={() => handleUpdateComment(comment.id)}
              onCancelEdit={() => {
                setEditingId(null)
                setEditContent('')
              }}
              onSubmitReply={() => handleCreateComment(comment.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface CommentItemProps {
  comment: Comment
  onReply: () => void
  onEdit: () => void
  onDelete: () => void
  onResolve: () => void
  isReplying: boolean
  isEditing: boolean
  editContent: string
  setEditContent: (content: string) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onSubmitReply: () => void
}

function CommentItem({
  comment,
  onReply,
  onEdit,
  onDelete,
  onResolve,
  isReplying,
  isEditing,
  editContent,
  setEditContent,
  onSaveEdit,
  onCancelEdit,
  onSubmitReply,
}: CommentItemProps) {
  const [showReplies, setShowReplies] = useState(false)
  const [replyContent, setReplyContent] = useState('')

  const authorName = comment.author?.raw_user_meta_data?.full_name || 
                     comment.author?.email?.split('@')[0] || 'Anônimo'

  return (
    <div className={`flex gap-3 ${comment.resolved ? 'opacity-60' : ''}`}>
      <Avatar className="h-8 w-8">
        <AvatarImage src={comment.author?.raw_user_meta_data?.avatar_url} />
        <AvatarFallback>{authorName[0]?.toUpperCase()}</AvatarFallback>
      </Avatar>
      
      <div className="flex-1 space-y-2">
        {/* Comment Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{authorName}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
            {comment.edited && (
              <span className="text-xs text-muted-foreground">(editado)</span>
            )}
            {comment.resolved && (
              <Badge variant="secondary" className="text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Resolvido
              </Badge>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!comment.resolved ? (
                <DropdownMenuItem onClick={onResolve}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Marcar como resolvido
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={onResolve}>
                  Reabrir
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onReply}>
                <Reply className="h-4 w-4 mr-2" />
                Responder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <Edit2 className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={onDelete}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Comment Content */}
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[80px]"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={onSaveEdit}>
                Salvar
              </Button>
              <Button size="sm" variant="ghost" onClick={onCancelEdit}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
        )}

        {/* Reply Input */}
        {isReplying && (
          <div className="mt-2 pl-4 border-l-2 border-primary space-y-2">
            <Textarea
              placeholder="Escreva sua resposta..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              className="min-h-[60px]"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  onSubmitReply()
                  setReplyContent('')
                }}
                disabled={!replyContent.trim()}
              >
                Responder
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setReplyingTo(null)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReplies(!showReplies)}
            >
              {showReplies ? 'Ocultar' : 'Mostrar'} {comment.replies.length}{' '}
              {comment.replies.length === 1 ? 'resposta' : 'respostas'}
            </Button>
            
            {showReplies && (
              <div className="mt-2 space-y-4 pl-4 border-l-2 border-muted">
                {comment.replies.map((reply) => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    onReply={() => {}}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    onResolve={() => {}}
                    isReplying={false}
                    isEditing={false}
                    editContent=""
                    setEditContent={() => {}}
                    onSaveEdit={() => {}}
                    onCancelEdit={() => {}}
                    onSubmitReply={() => {}}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
