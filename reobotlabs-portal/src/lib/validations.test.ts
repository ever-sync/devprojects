import { describe, it, expect } from 'vitest'
import {
  approvalSchema,
  billingMilestoneSchema,
  changeRequestSchema,
  contractSchema,
  invoiceSchema,
  projectRiskSchema,
  projectSchema,
  scopeVersionSchema,
  taskSchema,
  teamCapacitySchema,
  timeEntrySchema,
  commentSchema,
} from './validations'

describe('validations', () => {
  it('accepts a valid project', () => {
    const result = projectSchema.safeParse({
      name: 'Projeto Demo',
      type: 'saas',
      client_id: '2c6f4f62-8c1d-4f4b-9a5f-5b6ef5a9f2a1',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a project without name', () => {
    const result = projectSchema.safeParse({
      name: '',
      type: 'saas',
      client_id: '11111111-1111-1111-1111-111111111111',
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative hours in tasks', () => {
    const result = taskSchema.safeParse({
      title: 'Task',
      estimated_hours: -1,
      actual_hours: -2,
    })
    expect(result.success).toBe(false)
  })

  it('accepts a valid comment', () => {
    const result = commentSchema.safeParse({
      content: 'Atualizacao',
      is_internal: false,
    })
    expect(result.success).toBe(true)
  })

  it('accepts a valid scope version', () => {
    const result = scopeVersionSchema.safeParse({
      title: 'Escopo V1',
      summary: 'Resumo',
      scope_body: 'Implementar portal com autenticacao, tarefas e documentos.',
    })
    expect(result.success).toBe(true)
  })

  it('rejects change request without impact items', () => {
    const result = changeRequestSchema.safeParse({
      title: 'Mudanca',
      description: 'Adicionar um novo fluxo de aprovacao no portal.',
      items: [],
    })
    expect(result.success).toBe(false)
  })

  it('accepts a valid approval request', () => {
    const result = approvalSchema.safeParse({
      approval_kind: 'delivery',
      title: 'Aprovar primeira entrega',
      items: [{ label: 'Tela inicial homologada' }],
    })
    expect(result.success).toBe(true)
  })

  it('rejects a time entry above 24 hours', () => {
    const result = timeEntrySchema.safeParse({
      entry_date: '2026-03-10',
      hours: 25,
    })
    expect(result.success).toBe(false)
  })

  it('accepts a valid project risk', () => {
    const result = projectRiskSchema.safeParse({
      title: 'Atraso na homologacao',
      level: 'high',
      status: 'open',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid team capacity numbers', () => {
    const result = teamCapacitySchema.safeParse({
      user_id: '11111111-1111-1111-1111-111111111111',
      week_start: '2026-03-10',
      capacity_hours: -1,
      allocated_hours: 10,
    })
    expect(result.success).toBe(false)
  })

  it('accepts a valid contract payload', () => {
    const result = contractSchema.safeParse({
      contract_type: 'fixed',
      total_value: 15000,
      currency: 'BRL',
    })
    expect(result.success).toBe(true)
  })

  it('accepts a valid billing milestone', () => {
    const result = billingMilestoneSchema.safeParse({
      title: 'Primeira entrega',
      amount: 5000,
      status: 'ready',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invoice without number', () => {
    const result = invoiceSchema.safeParse({
      invoice_number: '',
      issue_date: '2026-03-10',
      amount: 1000,
      status: 'draft',
    })
    expect(result.success).toBe(false)
  })
})
