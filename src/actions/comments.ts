'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { commentSchema, type CommentInput } from '@/lib/validations'
import { triggerN8nEvent } from '@/lib/n8n'

export type CommentWithAuthor = {
  id: string
  content: string
  is_internal: boolean
  created_at: string
  author_id: string
  author: {
    id: string
    full_name: string
    avatar_url: string | null
    role: string
  }
}

export async function getTaskComments(taskId: string): Promise<{ comments?: CommentWithAuthor[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data, error } = await supabase
    .from('comments')
    .select('id, content, is_internal, created_at, author_id, author:profiles!comments_author_id_fkey(id, full_name, avatar_url, role)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })

  if (error) return { error: error.message }

  return { comments: (data ?? []) as unknown as CommentWithAuthor[] }
}

export async function createComment(projectId: string, data: CommentInput, taskId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const parsed = commentSchema.safeParse(data)
  if (!parsed.success) return { error: 'Dados inválidos' }

  const { error } = await supabase.from('comments').insert({
    project_id: projectId,
    task_id: taskId ?? null,
    author_id: user.id,
    content: parsed.data.content,
    is_internal: parsed.data.is_internal,
  })

  if (error) return { error: error.message }

  revalidatePath(`/projects/${projectId}/activity`)

  // Trigger n8n notification for new public comments
  if (!parsed.data.is_internal) {
    triggerN8nEvent({
      event: 'comment.created',
      projectId,
      data: { content: parsed.data.content, taskId },
    })
  }

  return { success: true }
}

export async function deleteComment(commentId: string, projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase.from('comments').delete().eq('id', commentId)
  if (error) return { error: error.message }

  revalidatePath(`/projects/${projectId}/activity`)
  return { success: true }
}
