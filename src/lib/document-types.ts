export const DOCUMENT_TYPE_META = {
  proposal: { label: 'Proposta', section: 'Comercial' },
  contract: { label: 'Contrato', section: 'Comercial' },
  invoice: { label: 'Nota Fiscal', section: 'Financeiro' },
  boleto: { label: 'Boleto', section: 'Financeiro' },
  report: { label: 'Relatorio', section: 'Operacional' },
  design: { label: 'Design', section: 'Operacional' },
  other: { label: 'Avulso', section: 'Avulsos' },
} as const

export type DocumentTypeKey = keyof typeof DOCUMENT_TYPE_META

export const DOCUMENT_TYPE_ORDER: DocumentTypeKey[] = [
  'proposal',
  'contract',
  'invoice',
  'boleto',
  'report',
  'design',
  'other',
]

export function normalizeDocumentType(docType: string | null | undefined): DocumentTypeKey {
  if (!docType) return 'other'
  const type = docType.toLowerCase()
  if (type in DOCUMENT_TYPE_META) return type as DocumentTypeKey
  return 'other'
}

export function getDocumentTypeLabel(docType: string | null | undefined): string {
  return DOCUMENT_TYPE_META[normalizeDocumentType(docType)].label
}

export function getDocumentTypeSection(docType: string | null | undefined): string {
  return DOCUMENT_TYPE_META[normalizeDocumentType(docType)].section
}

