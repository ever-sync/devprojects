import { ArrowRight } from 'lucide-react'

interface NextStepsBlockProps {
  content: string | null
}

export function NextStepsBlock({ content }: NextStepsBlockProps) {
  if (!content) return null

  return (
    <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
      <div className="flex items-center gap-2 mb-2">
        <ArrowRight className="w-4 h-4 text-blue-400 flex-shrink-0" />
        <h4 className="text-sm font-semibold text-blue-400">Próximos Passos desta Semana</h4>
      </div>
      <p className="text-sm text-blue-300/80 leading-relaxed whitespace-pre-line">{content}</p>
    </div>
  )
}
