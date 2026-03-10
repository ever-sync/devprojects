import { BookOpen } from 'lucide-react'

interface ScopeDefinitionProps {
  content: string | null
}

export function ScopeDefinition({ content }: ScopeDefinitionProps) {
  if (!content) return null

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="w-4 h-4 text-muted-foreground" />
        <h4 className="text-sm font-semibold text-foreground">Escopo do Projeto</h4>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{content}</p>
    </div>
  )
}
