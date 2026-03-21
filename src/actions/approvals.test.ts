import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('approvals security', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.resetModules()
  })

  it('prevents deciding an approval that is no longer pending', async () => {
    const profileBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(async () => ({ data: { role: 'client' }, error: null })),
    }

    const approvalSelectBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(async () => ({ data: { project_id: 'p1', status: 'approved' }, error: null })),
    }

    vi.doMock('@/lib/supabase/server', () => ({
      createClient: async () => ({
        auth: {
          getUser: async () => ({ data: { user: { id: 'u1' } } }),
        },
        from: (table: string) => {
          if (table === 'profiles') return profileBuilder
          if (table === 'approvals') return approvalSelectBuilder
          throw new Error(`unexpected table ${table}`)
        },
      }),
      createAdminClient: () => ({
        from: vi.fn(),
      }),
    }))

    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn() }))

    const { decideApproval } = await import('./approvals')
    const result = await decideApproval({ approvalId: 'a1', decision: 'approved' })
    expect(result).toEqual({ error: 'Aprovacao ja foi decidida' })
  })

  it('uses admin client to persist client decisions after RLS-backed access check', async () => {
    const profileBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(async () => ({ data: { role: 'client' }, error: null })),
    }

    const approvalSelectBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(async () => ({ data: { project_id: 'p1', status: 'pending' }, error: null })),
    }

    const adminUpdateBuilder = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }

    const adminFrom = vi.fn((table: string) => {
      if (table === 'approvals') return adminUpdateBuilder
      throw new Error(`unexpected table ${table}`)
    })

    vi.doMock('@/lib/supabase/server', () => ({
      createClient: async () => ({
        auth: {
          getUser: async () => ({ data: { user: { id: 'u1' } } }),
        },
        from: (table: string) => {
          if (table === 'profiles') return profileBuilder
          if (table === 'approvals') return approvalSelectBuilder
          throw new Error(`unexpected table ${table}`)
        },
      }),
      createAdminClient: () => ({
        from: adminFrom,
      }),
    }))

    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn() }))

    const { decideApproval } = await import('./approvals')
    const result = await decideApproval({ approvalId: 'a1', decision: 'approved' })

    expect(result).toEqual({ success: true })
    expect(adminFrom).toHaveBeenCalledWith('approvals')
    expect(adminUpdateBuilder.update).toHaveBeenCalledTimes(1)
  })
})
