'use client'

import { getPublicDocumentUrl } from '@/actions/public-portal'
import { getDocumentTypeLabel, getDocumentTypeSection } from '@/lib/document-types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Download, File, FileImage, FileSpreadsheet, FileText, FolderOpen } from 'lucide-react'
import type { Document } from '@/types'

const DOC_TYPE_BADGE: Record<string, string> = {
  proposal: 'bg-blue-50 text-blue-700 border-blue-200',
  contract: 'bg-violet-50 text-violet-700 border-violet-200',
  invoice: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  boleto: 'bg-amber-50 text-amber-700 border-amber-200',
  report: 'bg-orange-50 text-orange-700 border-orange-200',
  design: 'bg-pink-50 text-pink-700 border-pink-200',
  other: 'bg-slate-100 text-slate-600 border-slate-200',
}

const SECTION_ORDER = ['Comercial', 'Financeiro', 'Operacional', 'Avulsos']

function FileIcon({ mimeType }: { mimeType: string | null }) {
  if (!mimeType) return <File className="h-5 w-5 text-slate-400" />
  if (mimeType.startsWith('image/')) return <FileImage className="h-5 w-5 text-sky-500" />
  if (mimeType.includes('pdf')) return <FileText className="h-5 w-5 text-rose-500" />
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    return <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
  }
  return <File className="h-5 w-5 text-slate-400" />
}

function formatBytes(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function PublicDocumentRow({ doc, token }: { doc: Document; token: string }) {
  const badgeClass = DOC_TYPE_BADGE[doc.doc_type] ?? DOC_TYPE_BADGE.other

  async function handleDownload() {
    const { url } = await getPublicDocumentUrl(token, doc.file_path)
    if (url) window.open(url, '_blank')
  }

  return (
    <div className="flex items-start gap-3 rounded-3xl border border-slate-200/80 bg-slate-50/80 px-4 py-4 transition-colors hover:border-slate-300 hover:bg-white sm:items-center sm:gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white">
        <FileIcon mimeType={doc.mime_type} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900 sm:truncate">{doc.name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className={`rounded-full border px-2.5 py-1 font-semibold ${badgeClass}`}>
            {getDocumentTypeLabel(doc.doc_type)}
          </span>
          {doc.file_size ? <span>{formatBytes(doc.file_size)}</span> : null}
          <span>{format(new Date(doc.created_at), "d 'de' MMM", { locale: ptBR })}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDownload}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-500 transition-colors hover:bg-slate-950 hover:text-white"
        title="Baixar arquivo"
      >
        <Download className="h-4 w-4" />
      </button>
    </div>
  )
}

interface PublicDocumentListProps {
  documents: Document[]
  token: string
}

export function PublicDocumentList({ documents, token }: PublicDocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="rounded-[28px] border border-white/70 bg-white/85 px-6 py-16 text-center text-sm text-slate-500 shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
        Nenhum documento disponivel ainda.
      </div>
    )
  }

  const grouped = documents.reduce<Record<string, Document[]>>((acc, doc) => {
    const section = getDocumentTypeSection(doc.doc_type)
    if (!acc[section]) acc[section] = []
    acc[section].push(doc)
    return acc
  }, {})

  const presentSections = SECTION_ORDER.filter((section) => grouped[section]?.length > 0)

  return (
    <div className="space-y-5">
      {presentSections.map((section) => (
        <div key={section} className="rounded-[24px] border border-white/70 bg-white/85 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.05)] sm:rounded-[28px] sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-slate-700">
                <FolderOpen className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Secao</p>
                <h3 className="text-lg font-semibold tracking-[-0.03em] text-slate-950">{section}</h3>
              </div>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
              {grouped[section].length} arquivo(s)
            </span>
          </div>

          <div className="space-y-3">
            {grouped[section].map((doc) => (
              <PublicDocumentRow key={doc.id} doc={doc} token={token} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
