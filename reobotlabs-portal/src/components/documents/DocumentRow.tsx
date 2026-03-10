'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { deleteDocument } from '@/actions/documents'
import type { Document } from '@/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  FileText,
  FileImage,
  FileSpreadsheet,
  File,
  Download,
  Trash2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { getDocumentTypeLabel } from '@/lib/document-types'

function FileIcon({ mimeType }: { mimeType: string | null }) {
  if (!mimeType) return <File className="w-5 h-5 text-muted-foreground" />
  if (mimeType.startsWith('image/')) return <FileImage className="w-5 h-5 text-blue-400" />
  if (mimeType.includes('pdf')) return <FileText className="w-5 h-5 text-red-400" />
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel'))
    return <FileSpreadsheet className="w-5 h-5 text-green-400" />
  return <File className="w-5 h-5 text-muted-foreground" />
}

function formatBytes(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const DOC_TYPE_BADGE: Record<string, string> = {
  proposal: 'bg-blue-500/15 text-blue-400',
  contract: 'bg-purple-500/15 text-purple-400',
  invoice: 'bg-green-500/15 text-green-400',
  boleto: 'bg-yellow-500/15 text-yellow-400',
  report: 'bg-orange-500/15 text-orange-400',
  design: 'bg-pink-500/15 text-pink-400',
  other: 'bg-secondary text-muted-foreground',
}

interface DocumentRowProps {
  document: Document
  projectId: string
  isAdmin: boolean
}

export function DocumentRow({ document, projectId, isAdmin }: DocumentRowProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDownload() {
    const supabase = createClient()
    const { data } = await supabase.storage
      .from('project-files')
      .createSignedUrl(document.file_path, 60)

    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank')
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    await deleteDocument(document.id, document.file_path, projectId)
    setIsDeleting(false)
  }

  const badgeClass = DOC_TYPE_BADGE[document.doc_type] ?? DOC_TYPE_BADGE.other

  return (
    <div className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border hover:border-primary/30 transition-colors">
      <div className="flex-shrink-0">
        <FileIcon mimeType={document.mime_type} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{document.name}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <span className={`px-1.5 py-0.5 rounded font-medium ${badgeClass}`}>
            {getDocumentTypeLabel(document.doc_type)}
          </span>
          {document.file_size && <span>{formatBytes(document.file_size)}</span>}
          <span>{format(new Date(document.created_at), "d 'de' MMM", { locale: ptBR })}</span>
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDownload}>
          <Download className="w-4 h-4 text-muted-foreground" />
        </Button>
        {isAdmin && (
          <ConfirmDialog
            title="Excluir arquivo"
            description={`"${document.name}" será removido permanentemente do storage.`}
            confirmLabel="Excluir"
            onConfirm={handleDelete}
            trigger={
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                disabled={isDeleting}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            }
          />
        )}
      </div>
    </div>
  )
}
