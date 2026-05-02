'use server'

import { createAdminClient } from '@/lib/supabase/server'

interface AuditEvent {
  actorUserId?: string
  workspaceId?: string
  entityType: string
  entityId?: string
  action: string
  metadata?: Record<string, unknown>
}

export async function logAuditEvent(event: AuditEvent) {
  try {
    const supabase = createAdminClient()
    await supabase.from('audit_logs').insert({
      actor_user_id: event.actorUserId ?? null,
      workspace_id: event.workspaceId ?? null,
      entity_type: event.entityType,
      entity_id: event.entityId ?? null,
      action: event.action,
      metadata: (event.metadata ?? {}) as Record<string, never>,
    })
  } catch {
    // Auditoria nunca deve quebrar o fluxo principal
  }
}
