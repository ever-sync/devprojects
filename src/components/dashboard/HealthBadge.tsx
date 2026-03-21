import { HEALTH_CONFIG } from '@/lib/constants'
import type { HealthStatus } from '@/types'

interface HealthBadgeProps {
  health: string
  size?: 'sm' | 'md'
}

export function HealthBadge({ health, size = 'md' }: HealthBadgeProps) {
  const config = HEALTH_CONFIG[health as HealthStatus] ?? HEALTH_CONFIG.green
  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-[11px]'
    : 'px-2.5 py-1 text-xs'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClasses} ${config.bgColor} ${config.color}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor} flex-shrink-0`} />
      {config.label}
    </span>
  )
}
