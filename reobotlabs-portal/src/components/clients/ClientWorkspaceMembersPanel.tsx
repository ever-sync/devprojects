'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/shared/Avatar'
import {
  removeClientWorkspaceMember,
  updateClientWorkspaceMemberRole,
} from '@/actions/clients'

interface ClientWorkspaceMember {
  id: string
  role: 'owner' | 'admin' | 'member'
  profile: {
    id: string
    full_name: string
    email: string
    avatar_url: string | null
    role: string
  }
}

interface ClientWorkspaceMembersPanelProps {
  clientId: string
  members: ClientWorkspaceMember[]
}

export function ClientWorkspaceMembersPanel({
  clientId,
  members,
}: ClientWorkspaceMembersPanelProps) {
  const [isPending, startTransition] = useTransition()

  return (
    <div className="space-y-2">
      {members.map((member) => (
        <div
          key={member.id}
          className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3"
        >
          <div className="flex items-center gap-3">
            <Avatar
              name={member.profile.full_name}
              avatarUrl={member.profile.avatar_url}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {member.profile.full_name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {member.profile.email}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Cliente</Badge>
              <Badge variant="secondary" className="capitalize">
                {member.role}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {member.role !== 'owner' && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    const nextRole = member.role === 'admin' ? 'member' : 'admin'
                    const result = await updateClientWorkspaceMemberRole(
                      clientId,
                      member.id,
                      nextRole,
                    )

                    if (result.error) {
                      toast.error(result.error)
                      return
                    }

                    toast.success('Papel do membro atualizado')
                  })
                }
              >
                {member.role === 'admin' ? 'Tornar membro' : 'Tornar admin'}
              </Button>
            )}

            {member.role !== 'owner' && (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await removeClientWorkspaceMember(clientId, member.id)
                    if (result.error) {
                      toast.error(result.error)
                      return
                    }

                    toast.success('Membro removido do workspace')
                  })
                }
              >
                Remover
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
