import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('documents security', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.resetModules()
  })

  it('blocks non-admin users from deleting documents', async () => {
    const profileBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(async () => ({ data: { role: 'client' }, error: null })),
    }

    vi.doMock('@/lib/supabase/server', () => ({
      createClient: async () => ({
        auth: {
          getUser: async () => ({ data: { user: { id: 'u1' } } }),
        },
        from: (table: string) => {
          if (table === 'profiles') return profileBuilder
          throw new Error(`unexpected table ${table}`)
        },
        storage: {
          from: vi.fn(),
        },
      }),
    }))

    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn() }))

    const { deleteDocument } = await import('./documents')
    const result = await deleteDocument('doc1', 'client/project/file.pdf', 'project1')
    expect(result).toEqual({ error: 'Acesso negado' })
  })

  it('rejects delete requests when file path does not match the stored document', async () => {
    const profileBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(async () => ({ data: { role: 'admin' }, error: null })),
    }

    const documentSelectBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(async () => ({
        data: { id: 'doc1', file_path: 'client/project/original.pdf', project_id: 'project1' },
        error: null,
      })),
    }

    vi.doMock('@/lib/supabase/server', () => ({
      createClient: async () => ({
        auth: {
          getUser: async () => ({ data: { user: { id: 'u1' } } }),
        },
        from: (table: string) => {
          if (table === 'profiles') return profileBuilder
          if (table === 'documents') return documentSelectBuilder
          throw new Error(`unexpected table ${table}`)
        },
        storage: {
          from: vi.fn(),
        },
      }),
    }))

    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn() }))

    const { deleteDocument } = await import('./documents')
    const result = await deleteDocument('doc1', 'client/project/other.pdf', 'project1')
    expect(result).toEqual({ error: 'Arquivo inconsistente' })
  })
})
