import { AlertTriangle } from 'lucide-react'

interface ChallengesBlockProps {
  content: string | null
}

export function ChallengesBlock({ content }: ChallengesBlockProps) {
  if (!content) return null

  return (
    <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0" />
        <h4 className="text-sm font-semibold text-orange-400">Desafios / Impedimentos</h4>
      </div>
      <p className="text-sm text-orange-300/80 leading-relaxed whitespace-pre-line">{content}</p>
    </div>
  )
}
