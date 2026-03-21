import { PROJECT_TYPE_LABELS } from '@/lib/constants'
import type { ProjectType } from '@/types'

interface ProjectTypeBadgeProps {
  type: string
}

const typeColors: Record<string, string> = {
  saas: 'bg-primary/10 text-primary border-primary/25',
  automation: 'bg-primary/10 text-primary border-primary/25',
  ai_agent: 'bg-primary/10 text-primary border-primary/25',
}

export function ProjectTypeBadge({ type }: ProjectTypeBadgeProps) {
  const color = typeColors[type] ?? 'bg-secondary text-muted-foreground border-border'
  const label = PROJECT_TYPE_LABELS[type as ProjectType] ?? type

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${color}`}
    >
      {label}
    </span>
  )
}

