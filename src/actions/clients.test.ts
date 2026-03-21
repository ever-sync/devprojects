import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('clients security', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.resetModules()
  })

  it('blocks client users from creating client records', async () => {
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
      }),
      createAdminClient: () => ({}),
    }))

    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn() }))
    vi.doMock('next/navigation', () => ({ redirect: vi.fn() }))

    const { createClientRecord } = await import('./clients')
    const result = await createClientRecord({ name: 'Acme', industry: null, notes: null, website: null })
    expect(result).toEqual({ error: 'Acesso negado' })
  })

  it('adds invited client users to workspace membership', async () => {
    const profileBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(async () => ({ data: { role: 'admin' }, error: null })),
    }

    const workspaceMembersUpsert = vi.fn(async () => ({ error: null }))
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: async () => ({
        auth: {
          getUser: async () => ({ data: { user: { id: 'admin-1' } } }),
        },
        from: (table: string) => {
          if (table === 'profiles') return profileBuilder
          if (table === 'workspace_members') return { upsert: workspaceMembersUpsert }
          throw new Error(`unexpected table ${table}`)
        },
      }),
      createAdminClient: () => ({
        auth: {
          admin: {
            inviteUserByEmail: async () => ({ data: { user: { id: 'client-1' } }, error: null }),
          },
        },
      }),
    }))

    vi.doMock('@/lib/workspace-access', () => ({
      getClientWorkspaceId: async () => ({ workspaceId: 'workspace-1', error: null }),
    }))

    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn() }))
    vi.doMock('next/navigation', () => ({ redirect: vi.fn() }))

    const { inviteClientUser } = await import('./clients')
    const result = await inviteClientUser({
      client_id: 'client-a',
      full_name: 'Maria Client',
      email: 'maria@example.com',
    })

    expect(result).toEqual({ success: true })
    expect(workspaceMembersUpsert).toHaveBeenCalledWith({
      workspace_id: 'workspace-1',
      user_id: 'client-1',
      role: 'member',
    })
  })

  it('blocks removing the workspace owner', async () => {
    const profileBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(async () => ({ data: { role: 'admin' }, error: null })),
    }

    const workspaceMemberBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(async () => ({ data: { id: 'wm-1', user_id: 'owner-1', role: 'owner' }, error: null })),
    }

    vi.doMock('@/lib/supabase/server', () => ({
      createClient: async () => ({
        auth: {
          getUser: async () => ({ data: { user: { id: 'admin-1' } } }),
        },
        from: (table: string) => {
          if (table === 'profiles') return profileBuilder
          if (table === 'workspace_members') return workspaceMemberBuilder
          throw new Error(`unexpected table ${table}`)
        },
      }),
      createAdminClient: () => ({}),
    }))

    vi.doMock('@/lib/workspace-access', () => ({
      getClientWorkspaceId: async () => ({ workspaceId: 'workspace-1', error: null }),
    }))

    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn() }))
    vi.doMock('next/navigation', () => ({ redirect: vi.fn() }))

    const { removeClientWorkspaceMember } = await import('./clients')
    const result = await removeClientWorkspaceMember('client-a', 'wm-1')

    expect(result).toEqual({ error: 'Nao e possivel remover o owner do workspace' })
  })

  it('blocks invite when workspace member limit is reached', async () => {
    const profileBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(async () => ({ data: { role: 'admin' }, error: null })),
    }

    const inviteUserByEmail = vi.fn(async () => ({ data: { user: { id: 'client-1' } }, error: null }))

    vi.doMock('@/lib/supabase/server', () => ({
      createClient: async () => ({
        auth: {
          getUser: async () => ({ data: { user: { id: 'admin-1' } } }),
        },
        from: (table: string) => {
          if (table === 'profiles') return profileBuilder
          throw new Error(`unexpected table ${table}`)
        },
      }),
      createAdminClient: () => ({
        auth: {
          admin: {
            inviteUserByEmail,
          },
        },
      }),
    }))

    vi.doMock('@/lib/workspace-access', () => ({
      getClientWorkspaceId: async () => ({ workspaceId: 'workspace-1', error: null }),
      createAuditLog: vi.fn(),
    }))

    vi.doMock('@/lib/workspace-limits', () => ({
      checkWorkspaceMemberLimit: async () => ({
        allowed: false,
        error: 'Limite de membros do plano Starter atingido',
      }),
    }))

    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn() }))
    vi.doMock('next/navigation', () => ({ redirect: vi.fn() }))

    const { inviteClientUser } = await import('./clients')
    const result = await inviteClientUser({
      client_id: 'client-a',
      full_name: 'Maria Client',
      email: 'maria@example.com',
    })

    expect(result).toEqual({ error: 'Limite de membros do plano Starter atingido' })
    expect(inviteUserByEmail).not.toHaveBeenCalled()
  })
})
