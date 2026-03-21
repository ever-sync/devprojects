/**
 * Fase 3: Colaboração Avançada e UX
 * Server Actions para comentários em thread, atalhos, preferências e sync offline
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ==================== Schemas ====================

export const commentThreadSchema = z.object({
  taskId: z.string().uuid().optional(),
  documentId: z.string().uuid().optional(),
  parentCommentId: z.string().uuid().optional(),
  content: z.string().min(1).max(5000),
  workspaceId: z.string().uuid()
})

export const resolveCommentSchema = z.object({
  commentId: z.string().uuid(),
  resolved: z.boolean()
})

export const mentionSchema = z.object({
  commentId: z.string().uuid(),
  mentionedUserId: z.string().uuid()
})

export const keyboardShortcutsSchema = z.object({
  shortcuts: z.record(z.string(), z.string())
})

export const uiPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  compactMode: z.boolean().optional(),
  fontSize: z.enum(['small', 'medium', 'large']).optional(),
  sidebarCollapsed: z.boolean().optional(),
  defaultView: z.string().optional(),
  timezone: z.string().optional(),
  dateFormat: z.string().optional()
})

export const offlineSyncSchema = z.object({
  operationType: z.enum(['CREATE', 'UPDATE', 'DELETE']),
  entityType: z.string(),
  entityId: z.string().uuid().optional(),
  payload: z.record(z.unknown())
})

export const activityLogSchema = z.object({
  actionType: z.string(),
  entityType: z.string(),
  entityId: z.string().uuid().optional(),
  previousState: z.record(z.unknown()).optional(),
  newState: z.record(z.unknown()).optional(),
  canUndo: z.boolean().default(true)
})

// ==================== Types ====================

export type CommentThreadInput = z.infer<typeof commentThreadSchema>
export type ResolveCommentInput = z.infer<typeof resolveCommentSchema>
export type MentionInput = z.infer<typeof mentionSchema>
export type KeyboardShortcutsInput = z.infer<typeof keyboardShortcutsSchema>
export type UIPreferencesInput = z.infer<typeof uiPreferencesSchema>
export type OfflineSyncInput = z.infer<typeof offlineSyncSchema>
export type ActivityLogInput = z.infer<typeof activityLogSchema>

// ==================== Comment Threads ====================

export async function createCommentThread(input: CommentThreadInput) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { error: 'Unauthorized' }
    }

    const validated = commentThreadSchema.parse(input)

    const { data, error } = await supabase
      .from('task_comment_threads')
      .insert({
        task_id: validated.taskId,
        document_id: validated.documentId,
        parent_comment_id: validated.parentCommentId,
        workspace_id: validated.workspaceId,
        author_id: user.id,
        content: validated.content
      })
      .select()
      .single()

    if (error) throw error

    // Update comment count on task
    if (validated.taskId) {
      await supabase.rpc('increment_task_comment_count', { 
        task_id: validated.taskId 
      })
    }

    revalidatePath(`/projects/${validated.taskId ? 'task' : 'document'}`)
    return { success: true, data }
  } catch (error) {
    console.error('Error creating comment thread:', error)
    return { error: 'Failed to create comment' }
  }
}

export async function updateCommentThread(commentId: string, content: string) {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('task_comment_threads')
      .update({ 
        content, 
        edited: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/projects')
    return { success: true, data }
  } catch (error) {
    console.error('Error updating comment:', error)
    return { error: 'Failed to update comment' }
  }
}

export async function deleteCommentThread(commentId: string) {
  try {
    const supabase = await createClient()
    
    // Get comment to find task_id
    const { data: comment } = await supabase
      .from('task_comment_threads')
      .select('task_id')
      .eq('id', commentId)
      .single()

    const { error } = await supabase
      .from('task_comment_threads')
      .delete()
      .eq('id', commentId)

    if (error) throw error

    // Decrement comment count
    if (comment?.task_id) {
      await supabase.rpc('decrement_task_comment_count', { 
        task_id: comment.task_id 
      })
    }

    revalidatePath('/projects')
    return { success: true }
  } catch (error) {
    console.error('Error deleting comment:', error)
    return { error: 'Failed to delete comment' }
  }
}

export async function resolveCommentThread(input: ResolveCommentInput) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { error: 'Unauthorized' }
    }

    const validated = resolveCommentSchema.parse(input)

    const { data, error } = await supabase
      .from('task_comment_threads')
      .update({
        resolved: validated.resolved,
        resolved_by: validated.resolved ? user.id : null,
        resolved_at: validated.resolved ? new Date().toISOString() : null
      })
      .eq('id', validated.commentId)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/projects')
    return { success: true, data }
  } catch (error) {
    console.error('Error resolving comment:', error)
    return { error: 'Failed to resolve comment' }
  }
}

export async function getCommentThreads(taskId?: string, documentId?: string) {
  try {
    const supabase = await createClient()
    
    let query = supabase
      .from('task_comment_threads')
      .select(`
        *,
        author:author_id (id, email, raw_user_meta_data),
        resolver:resolved_by (id, email, raw_user_meta_data),
        replies:task_comment_threads (
          *,
          author:author_id (id, email, raw_user_meta_data)
        ),
        mentions:comment_mentions (
          mentioned_user:mentioned_user_id (id, email, raw_user_meta_data)
        )
      `)
      .order('created_at', { ascending: true })

    if (taskId) {
      query = query.eq('task_id', taskId)
    } else if (documentId) {
      query = query.eq('document_id', documentId)
    }

    const { data, error } = await query

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error fetching comment threads:', error)
    return { error: 'Failed to fetch comments' }
  }
}

// ==================== Mentions ====================

export async function createMention(input: MentionInput) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { error: 'Unauthorized' }
    }

    const validated = mentionSchema.parse(input)

    const { data, error } = await supabase
      .from('comment_mentions')
      .insert({
        comment_id: validated.commentId,
        mentioned_user_id: validated.mentionedUserId,
        mentioned_by: user.id
      })
      .select()
      .single()

    if (error) throw error

    // Create notification for mentioned user
    await supabase.from('notifications').insert({
      user_id: validated.mentionedUserId,
      type: 'mention',
      title: 'Você foi mencionado',
      link: `/comments/${validated.commentId}`
    })

    return { success: true, data }
  } catch (error) {
    console.error('Error creating mention:', error)
    return { error: 'Failed to create mention' }
  }
}

export async function markMentionAsRead(mentionId: string) {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('comment_mentions')
      .update({ read: true })
      .eq('id', mentionId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error marking mention as read:', error)
    return { error: 'Failed to mark mention as read' }
  }
}

// ==================== Keyboard Shortcuts ====================

export async function getUserKeyboardShortcuts() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { error: 'Unauthorized' }
    }

    const { data, error } = await supabase
      .from('user_keyboard_shortcuts')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    return { success: true, data: data || { shortcuts: {} } }
  } catch (error) {
    console.error('Error fetching keyboard shortcuts:', error)
    return { error: 'Failed to fetch shortcuts' }
  }
}

export async function saveKeyboardShortcuts(input: KeyboardShortcutsInput) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { error: 'Unauthorized' }
    }

    const validated = keyboardShortcutsSchema.parse(input)

    const { data, error } = await supabase
      .from('user_keyboard_shortcuts')
      .upsert({
        user_id: user.id,
        shortcuts: validated.shortcuts,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/settings')
    return { success: true, data }
  } catch (error) {
    console.error('Error saving keyboard shortcuts:', error)
    return { error: 'Failed to save shortcuts' }
  }
}

// ==================== UI Preferences ====================

export async function getUserUIPreferences() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { error: 'Unauthorized' }
    }

    const { data, error } = await supabase
      .from('user_ui_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    return { success: true, data: data || {} }
  } catch (error) {
    console.error('Error fetching UI preferences:', error)
    return { error: 'Failed to fetch preferences' }
  }
}

export async function saveUIPreferences(input: UIPreferencesInput) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { error: 'Unauthorized' }
    }

    const validated = uiPreferencesSchema.parse(input)

    const { data, error } = await supabase
      .from('user_ui_preferences')
      .upsert({
        user_id: user.id,
        ...validated,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/settings')
    return { success: true, data }
  } catch (error) {
    console.error('Error saving UI preferences:', error)
    return { error: 'Failed to save preferences' }
  }
}

// ==================== Offline Sync Queue ====================

export async function addToOfflineSyncQueue(input: OfflineSyncInput) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { error: 'Unauthorized' }
    }

    const validated = offlineSyncSchema.parse(input)

    const { data, error } = await supabase
      .from('offline_sync_queue')
      .insert({
        user_id: user.id,
        operation_type: validated.operationType,
        entity_type: validated.entityType,
        entity_id: validated.entityId,
        payload: validated.payload
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error adding to sync queue:', error)
    return { error: 'Failed to add to sync queue' }
  }
}

export async function getPendingSyncOperations() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { error: 'Unauthorized' }
    }

    const { data, error } = await supabase
      .from('offline_sync_queue')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error fetching sync operations:', error)
    return { error: 'Failed to fetch sync operations' }
  }
}

export async function markSyncOperationCompleted(operationId: string) {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('offline_sync_queue')
      .update({ 
        status: 'completed',
        synced_at: new Date().toISOString()
      })
      .eq('id', operationId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error marking sync completed:', error)
    return { error: 'Failed to mark sync completed' }
  }
}

export async function markSyncOperationFailed(operationId: string, errorMessage: string) {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('offline_sync_queue')
      .update({ 
        status: 'failed',
        error_message: errorMessage,
        retry_count: supabase.raw('retry_count + 1')
      })
      .eq('id', operationId)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error marking sync failed:', error)
    return { error: 'Failed to mark sync failed' }
  }
}

// ==================== Activity Log (Undo/Redo) ====================

export async function logUserActivity(input: ActivityLogInput) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { error: 'Unauthorized' }
    }

    const validated = activityLogSchema.parse(input)

    const { data, error } = await supabase
      .from('user_activity_log')
      .insert({
        user_id: user.id,
        workspace_id: input.workspaceId,
        action_type: validated.actionType,
        entity_type: validated.entityType,
        entity_id: validated.entityId,
        previous_state: validated.previousState,
        new_state: validated.newState,
        can_undo: validated.canUndo
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error logging activity:', error)
    return { error: 'Failed to log activity' }
  }
}

export async function getRecentActivities(limit = 50) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { error: 'Unauthorized' }
    }

    const { data, error } = await supabase
      .from('user_activity_log')
      .select('*')
      .eq('user_id', user.id)
      .eq('undone', false)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error fetching activities:', error)
    return { error: 'Failed to fetch activities' }
  }
}

export async function undoActivity(activityId: string) {
  try {
    const supabase = await createClient()
    
    // Get activity
    const { data: activity, error: fetchError } = await supabase
      .from('user_activity_log')
      .select('*')
      .eq('id', activityId)
      .single()

    if (fetchError) throw fetchError
    if (!activity.can_undo || activity.undone) {
      return { error: 'Cannot undo this activity' }
    }

    // Mark as undone
    const { error } = await supabase
      .from('user_activity_log')
      .update({ undone: true })
      .eq('id', activityId)

    if (error) throw error

    return { success: true, previousState: activity.previous_state }
  } catch (error) {
    console.error('Error undoing activity:', error)
    return { error: 'Failed to undo activity' }
  }
}
