import { BookOpen } from 'lucide-react'

interface ScopeDefinitionProps {
  content: string | null
}

function parseScopeItems(content: string) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const normalized = line.replace(/^[-*•]\s*/, '')
      const divider = normalized.match(/^([^:.-][^:]*?)\s*(?::| - )\s*(.+)$/)

      if (!divider) {
        return {
          title: null,
          description: normalized,
        }
      }

      return {
        title: divider[1].trim(),
        description: divider[2].trim(),
      }
    })
}

export function ScopeDefinition({ content }: ScopeDefinitionProps) {
  if (!content) return null

  const items = parseScopeItems(content)
  const hasStructuredItems = items.some((item) => item.title)

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <BookOpen className="h-4 w-4" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground">Escopo do Projeto</h4>
          <p className="text-xs text-muted-foreground">Itens principais, fases e entregas previstas.</p>
        </div>
      </div>

      {hasStructuredItems ? (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={`${item.title ?? 'scope'}-${index}`} className="rounded-2xl border border-border/70 bg-background/80 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                  {index + 1}
                </div>
                <div className="min-w-0 space-y-1">
                  {item.title ? (
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  ) : null}
                  <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{content}</p>
      )}
    </div>
  )
}
