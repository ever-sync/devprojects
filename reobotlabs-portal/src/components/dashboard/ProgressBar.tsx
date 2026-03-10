interface ProgressBarProps {
  value: number
  showLabel?: boolean
  className?: string
}

export function ProgressBar({ value, showLabel = true, className = '' }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))

  return (
    <div className={className}>
      {showLabel && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted-foreground">Progresso</span>
          <span className="text-xs font-semibold text-foreground">{clamped}%</span>
        </div>
      )}
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}
