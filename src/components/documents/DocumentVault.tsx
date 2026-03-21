'use client'

import { useState } from 'react'
import { Folder } from 'lucide-react'
import { DocumentRow } from './DocumentRow'
import { UploadDropzone } from './UploadDropzone'
import { EmptyState } from '@/components/shared/EmptyState'
import type { Document } from '@/types'
import { getDocumentTypeSection } from '@/lib/document-types'

interface DocumentVaultProps {
  documents: Document[]
  projectId: string
  clientId: string
  isAdmin: boolean
}

type SectionFilter = 'Todos' | 'Comercial' | 'Financeiro' | 'Operacional' | 'Avulsos'

const SECTION_ORDER: SectionFilter[] = ['Todos', 'Comercial', 'Financeiro', 'Operacional', 'Avulsos']

export function DocumentVault({ documents, projectId, clientId, isAdmin }: DocumentVaultProps) {
  const [activeFilter, setActiveFilter] = useState<SectionFilter>('Todos')

  const sectionCounts = documents.reduce<Record<string, number>>((acc, doc) => {
    const section = getDocumentTypeSection(doc.doc_type)
    acc[section] = (acc[section] ?? 0) + 1
    return acc
  }, {})

  const availableFilters = SECTION_ORDER.filter(
    (section) => section === 'Todos' || (sectionCounts[section] ?? 0) > 0,
  )

  const filteredDocuments =
    activeFilter === 'Todos'
      ? documents
      : documents.filter((doc) => getDocumentTypeSection(doc.doc_type) === activeFilter)

  const grouped = filteredDocuments.reduce<Record<string, Document[]>>((acc, doc) => {
    const section = getDocumentTypeSection(doc.doc_type)
    if (!acc[section]) acc[section] = []
    acc[section].push(doc)
    return acc
  }, {})

  const presentSections = SECTION_ORDER.filter(
    (section) => section !== 'Todos' && grouped[section] && grouped[section].length > 0,
  )

  return (
    <div className="space-y-6">
      {isAdmin ? (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-foreground">Enviar arquivo</h3>
          <UploadDropzone projectId={projectId} clientId={clientId} />
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground">Arquivos ({documents.length})</h3>

          {availableFilters.length > 1 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {availableFilters.map((section) => {
                const count = section === 'Todos' ? documents.length : (sectionCounts[section] ?? 0)
                const isActive = activeFilter === section

                return (
                  <button
                    key={section}
                    type="button"
                    onClick={() => setActiveFilter(section)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
                    }`}
                  >
                    {section}
                    <span
                      className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold ${
                        isActive
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>

        {documents.length === 0 ? (
          <EmptyState
            icon={<Folder className="h-10 w-10" />}
            title="Nenhum arquivo"
            description={
              isAdmin
                ? 'Faca upload de contratos, propostas e outros arquivos acima.'
                : 'A agencia ainda nao enviou nenhum arquivo.'
            }
          />
        ) : filteredDocuments.length === 0 ? (
          <EmptyState
            icon={<Folder className="h-10 w-10" />}
            title="Nenhum arquivo nesta categoria"
            description="Selecione outro filtro para ver os arquivos."
          />
        ) : (
          <div className="space-y-5">
            {presentSections.map((section) => (
              <div key={section}>
                {activeFilter === 'Todos' || presentSections.length > 1 ? (
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {section}
                    </span>
                    <span className="text-xs text-muted-foreground/60">{grouped[section].length}</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                ) : null}

                <div className="space-y-2">
                  {grouped[section].map((doc) => (
                    <DocumentRow
                      key={doc.id}
                      document={doc}
                      projectId={projectId}
                      isAdmin={isAdmin}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
