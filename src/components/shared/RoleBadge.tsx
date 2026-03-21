import { Badge } from '@/components/ui/badge'
import type { UserRole } from '@/types'

interface RoleBadgeProps {
  role: UserRole
}

export function RoleBadge({ role }: RoleBadgeProps) {
  if (role === 'admin') {
    return (
      <Badge variant="secondary" className="bg-primary/20 text-primary hover:bg-primary/30">
        Admin
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="bg-secondary text-muted-foreground">
      Cliente
    </Badge>
  )
}
