import { describe, it, expect, vi, beforeEach } from 'vitest'

type QueryResult<T> = { data: T | null; error: { message: string } | null }

function makeBuilder<T>(result: QueryResult<T>) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(async () => result),
    then: (resolve: (value: QueryResult<T>) => void) => Promise.resolve(result).then(resolve),
  }
}

describe('activities actions', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.resetModules()
  })

  it('returns error when public token is invalid', async () => {
    const projectBuilder = makeBuilder<unknown>({ data: null, error: { message: 'not found' } })

    vi.doMock('@/lib/supabase/server', () => ({
      createAdminClient: () => ({
        from: (table: string) => {
          if (table === 'projects') return projectBuilder
          return makeBuilder({ data: [], error: null })
        },
      }),
    }))

    const { getPublicProjectActivities } = await import('./activities')
    const res = await getPublicProjectActivities('bad-token')
    expect(res.data).toEqual([])
    expect(res.error).toBe('Projeto não encontrado')
  })

  it('returns activities when token is valid', async () => {
    const projectBuilder = makeBuilder<{ id: string }>({
      data: { id: 'p1' },
      error: null,
    })
    const activities = [
      {
        id: 'a1',
        project_id: 'p1',
        user_id: 'u1',
        action: 'created',
        old_value: null,
        new_value: 'Demo',
        metadata: {},
        created_at: new Date().toISOString(),
        user: { full_name: 'Ana', avatar_url: null, role: 'admin' },
      },
    ]
    const activityBuilder = makeBuilder<typeof activities>({ data: activities, error: null })

    vi.doMock('@/lib/supabase/server', () => ({
      createAdminClient: () => ({
        from: (table: string) => {
          if (table === 'projects') return projectBuilder
          if (table === 'project_activities') return activityBuilder
          return makeBuilder({ data: [], error: null })
        },
      }),
    }))

    const { getPublicProjectActivities } = await import('./activities')
    const res = await getPublicProjectActivities('good-token')
    expect(res.data.length).toBe(1)
    expect(res.error).toBeNull()
  })
})
