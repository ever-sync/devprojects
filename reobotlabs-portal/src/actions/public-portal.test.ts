import { beforeEach, describe, expect, it, vi } from 'vitest'

type QueryResult<T> = { data: T | null; error: { message: string } | null }

function makeBuilder<T>(result: QueryResult<T>) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(async () => result),
  }
}

describe('public-portal actions', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.resetModules()
  })

  it('returns error when token is invalid', async () => {
    const builder = makeBuilder<unknown>({ data: null, error: { message: 'not found' } })
    vi.doMock('@/lib/supabase/server', () => ({
      createAdminClient: () => ({
        from: () => builder,
      }),
    }))

    const { getProjectByPublicToken } = await import('./public-portal')
    const res = await getProjectByPublicToken('bad-token')
    expect(res.data).toBeNull()
    expect(res.error).toBe('not found')
  })

  it('returns project when token is valid', async () => {
    const project = { id: 'p1', name: 'Demo' }
    const builder = makeBuilder<typeof project>({ data: project, error: null })
    vi.doMock('@/lib/supabase/server', () => ({
      createAdminClient: () => ({
        from: () => builder,
      }),
    }))

    const { getProjectByPublicToken } = await import('./public-portal')
    const res = await getProjectByPublicToken('good-token')
    expect(res.data?.id).toBe('p1')
    expect(res.error).toBeNull()
  })

  it('rejects public signed URL requests for files outside the project document list', async () => {
    const projectBuilder = makeBuilder<{ id: string }>({ data: { id: 'p1' }, error: null })
    const documentBuilder = makeBuilder<unknown>({ data: null, error: { message: 'not found' } })

    vi.doMock('@/lib/supabase/server', () => ({
      createAdminClient: () => ({
        from: (table: string) => {
          if (table === 'projects') return projectBuilder
          if (table === 'documents') return documentBuilder
          throw new Error(`unexpected table ${table}`)
        },
        storage: {
          from: vi.fn(),
        },
      }),
    }))

    const { getPublicDocumentUrl } = await import('./public-portal')
    const result = await getPublicDocumentUrl('good-token', 'other-client/other-project/leak.pdf')

    expect(result).toEqual({ url: null, error: 'Documento nao encontrado' })
  })
})
