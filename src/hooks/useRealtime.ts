'use client'

import { useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UseRealtimeOptions {
  table: string
  filter?: string // e.g. "project_id=eq.abc123"
  onInsert?: (payload: Record<string, unknown>) => void
  onUpdate?: (payload: Record<string, unknown>) => void
  onDelete?: (payload: Record<string, unknown>) => void
}

export function useRealtime({ table, filter, onInsert, onUpdate, onDelete }: UseRealtimeOptions) {
  const subscribe = useCallback(() => {
    const supabase = createClient()

    let channel = supabase.channel(`realtime:${table}:${filter ?? 'all'}`)

    const config = {
      event: '*' as const,
      schema: 'public',
      table,
      ...(filter ? { filter } : {}),
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    channel = (channel as any).on('postgres_changes', config, (payload: any) => {
      if (payload.eventType === 'INSERT' && onInsert) {
        onInsert(payload.new as Record<string, unknown>)
      } else if (payload.eventType === 'UPDATE' && onUpdate) {
        onUpdate(payload.new as Record<string, unknown>)
      } else if (payload.eventType === 'DELETE' && onDelete) {
        onDelete(payload.old as Record<string, unknown>)
      }
    })

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, filter, onInsert, onUpdate, onDelete])

  useEffect(() => {
    const unsubscribe = subscribe()
    return unsubscribe
  }, [subscribe])
}
