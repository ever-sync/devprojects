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
    <div className="group/doc border border-white/80 bg-white/50 backdrop-blur-sm relative flex items-center gap-4 rounded-[28px] p-5 transition-all duration-300 hover:bg-white hover:shadow-lg">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition-transform group-hover/doc:scale-110">
        <FileIcon mimeType={doc.mime_type} />
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <p className="truncate text-sm font-bold text-slate-950 tracking-tight" title={doc.name}>{doc.name}</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeClass} bg-white/40 backdrop-blur-sm`}>
            {getDocumentTypeLabel(doc.doc_type)}
          </span>
          <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {doc.file_size ? <span>{formatBytes(doc.file_size)}</span> : null}
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span>{format(new Date(doc.created_at), "d 'de' MMM", { locale: ptBR })}</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDownload}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 transition-all duration-300 hover:bg-slate-950 hover:text-white hover:shadow-md"
        title="Baixar arquivo"
      >
        <Download className="h-5 w-5" />
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
    <div className="space-y-4 sm:space-y-5">
      {presentSections.map((section) => (
        <div key={section} className="group rounded-[28px] border border-white/80 bg-white/50 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-all duration-300 hover:bg-white/65 sm:rounded-[40px] sm:p-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm transition-transform group-hover:scale-105">
                <FolderOpen className="h-6 w-6" />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Diretório</p>
                <h3 className="text-xl font-bold tracking-tight text-slate-950">{section}</h3>
              </div>
            </div>
            <span className="rounded-full border border-slate-200 bg-white/50 backdrop-blur-sm px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
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
