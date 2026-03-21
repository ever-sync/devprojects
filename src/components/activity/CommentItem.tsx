import { Avatar } from '@/components/shared/Avatar'
import type { CommentWithAuthor } from '@/types'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Lock, ArrowRight, Activity } from 'lucide-react'

interface CommentItemProps {
  comment: CommentWithAuthor
  isAdmin: boolean
}

function parseSystemEvent(content: string) {
  const statusMatch = content.match(/^\[\[system:status\]\] (.+)$/)
  const healthMatch = content.match(/^\[\[system:health\]\] (.+)$/)
  if (statusMatch) return { type: 'status', text: statusMatch[1] }
  if (healthMatch) return { type: 'health', text: healthMatch[1] }
  return null
}

export function CommentItem({ comment, isAdmin }: CommentItemProps) {
  const systemEvent = parseSystemEvent(comment.content)

  // Render system event as a compact timeline entry (admin only)
  if (systemEvent) {
    if (!isAdmin) return null
    const [from, to] = systemEvent.text.split(' → ')
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
          <Activity className="w-3 h-3" />
        </div>
        <span>{systemEvent.type === 'status' ? 'Status alterado:' : 'Saúde alterada:'}</span>
        <span className="font-medium text-foreground/70">{from}</span>
        <ArrowRight className="w-3 h-3" />
        <span className="font-medium text-foreground/70">{to}</span>
        <span className="ml-auto shrink-0">
          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ptBR })}
        </span>
      </div>
    )
  }

  return (
    <div className={`flex gap-3 ${comment.is_internal ? 'opacity-75' : ''}`}>
      <Avatar
        name={comment.author.full_name}
        avatarUrl={comment.author.avatar_url}
        size="sm"
        className="shrink-0 mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="bg-card rounded-xl border border-border px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-foreground">
              {comment.author.full_name}
            </span>
            {comment.author.role === 'admin' && (
              <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                Equipe
              </span>
            )}
            {comment.is_internal && isAdmin && (
              <span className="flex items-center gap-1 text-xs bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded">
                <Lock className="w-3 h-3" />
                Interno
              </span>
            )}
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
            {comment.content}
          </p>
        </div>
        <p
          className="text-xs text-muted-foreground mt-1 ml-1"
          title={format(new Date(comment.created_at), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
        >
          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ptBR })}
        </p>
      </div>
    </div>
  )
}
