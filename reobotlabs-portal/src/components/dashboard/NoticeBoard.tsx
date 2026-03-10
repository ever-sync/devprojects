import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Megaphone, Pin } from 'lucide-react'
import { Avatar } from '@/components/shared/Avatar'
import type { CommentWithAuthor } from '@/types'

interface NoticeBoardProps {
  notices: CommentWithAuthor[]
}

export function NoticeBoard({ notices }: NoticeBoardProps) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <div className="w-6 h-6 rounded-lg bg-primary/12 flex items-center justify-center">
          <Megaphone className="w-3.5 h-3.5 text-primary" />
        </div>
        <p className="text-sm font-semibold text-foreground">Quadro de Avisos</p>
        <span className="ml-auto text-[10px] font-medium bg-primary/12 text-primary px-1.5 py-0.5 rounded-full">
          Interno
        </span>
      </div>

      {notices.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <Pin className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Nenhum aviso recente</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {notices.map((notice) => {
            const author = notice.author as typeof notice.author | null
            if (!author) return null
            return (
            <div key={notice.id} className="px-4 py-3 hover:bg-sidebar-accent/40 transition-colors">
              <div className="flex items-start gap-2.5">
                <Avatar
                  name={author.full_name}
                  avatarUrl={author.avatar_url}
                  size="sm"
                  className="flex-shrink-0 mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {author.full_name}
                    </p>
                    <p className="text-[10px] text-muted-foreground whitespace-nowrap ml-auto">
                      {formatDistanceToNow(new Date(notice.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{notice.content}</p>
                </div>
              </div>
            </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

