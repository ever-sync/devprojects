'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, role: null }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return { supabase, user, role: profile?.role ?? null }
}

export async function deleteDocument(documentId: string, filePath: string, projectId: string) {
  const { supabase, user, role } = await requireAdmin()
  if (!user) return { error: 'Nao autenticado' }
  if (role !== 'admin') return { error: 'Acesso negado' }

  const { data: document, error: documentError } = await supabase
    .from('documents')
    .select('id, file_path, project_id')
    .eq('id', documentId)
    .eq('project_id', projectId)
    .single()

  if (documentError || !document) return { error: 'Documento nao encontrado' }
  if (document.file_path !== filePath) return { error: 'Arquivo inconsistente' }

  const { error: storageError } = await supabase.storage.from('project-files').remove([filePath])
  if (storageError) return { error: storageError.message }

  const { error: dbError } = await supabase.from('documents').delete().eq('id', documentId)
  if (dbError) return { error: dbError.message }

  revalidatePath(`/projects/${projectId}/documents`)
  return { success: true }
}
