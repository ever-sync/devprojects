'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { markNotificationRead, markAllNotificationsRead } from '@/actions/notifications'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Notification } from '@/types'

interface NotificationBellProps {
  notifications: Notification[]
  userId: string
}

export function NotificationBell({ notifications: initial, userId }: NotificationBellProps) {
  const [items, setItems] = useState(initial)
  const unread = items.filter((n) => !n.read_at).length

  async function handleMarkRead(id: string) {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    )
    await markNotificationRead(id)
  }

  async function handleMarkAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })))
    await markAllNotificationsRead(userId)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center leading-none">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="font-semibold text-sm">Notificações</span>
          {unread > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-primary hover:underline"
            >
              Marcar todas como lidas
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhuma notificação
            </div>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                onClick={() => { if (!n.read_at) handleMarkRead(n.id) }}
                className={`w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors border-b border-border/40 last:border-0 flex items-start gap-3 ${!n.read_at ? 'bg-primary/5' : ''}`}
              >
                {!n.read_at && (
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                )}
                <div className={!n.read_at ? '' : 'pl-5'}>
                  <p className="text-sm font-medium text-foreground leading-tight">{n.title}</p>
                  {n.body && (
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{n.body}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
