'use client'

import { useMemo, useState } from 'react'
import type { ProjectScopeVersion } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

type DiffRow = {
  kind: 'same' | 'added' | 'removed' | 'changed'
  left: string
  right: string
}

function toLines(value: string | null | undefined) {
  return (value ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function buildLineDiff(leftValue: string | null | undefined, rightValue: string | null | undefined) {
  const left = toLines(leftValue)
  const right = toLines(rightValue)
  const max = Math.max(left.length, right.length)
  const rows: DiffRow[] = []

  for (let index = 0; index < max; index++) {
    const leftLine = left[index] ?? ''
    const rightLine = right[index] ?? ''

    if (leftLine && rightLine && leftLine === rightLine) {
      rows.push({ kind: 'same', left: leftLine, right: rightLine })
    } else if (!leftLine && rightLine) {
      rows.push({ kind: 'added', left: '', right: rightLine })
    } else if (leftLine && !rightLine) {
      rows.push({ kind: 'removed', left: leftLine, right: '' })
    } else {
      rows.push({ kind: 'changed', left: leftLine, right: rightLine })
    }
  }

  return rows
}

function kindBadge(kind: DiffRow['kind']) {
  if (kind === 'added') return <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20">Adicionado</Badge>
  if (kind === 'removed') return <Badge className="bg-red-500/10 text-red-700 border-red-500/20">Removido</Badge>
  if (kind === 'changed') return <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20">Alterado</Badge>
  return <Badge variant="outline">Igual</Badge>
}

function rowClass(kind: DiffRow['kind']) {
  if (kind === 'added') return 'bg-emerald-500/5'
  if (kind === 'removed') return 'bg-red-500/5'
  if (kind === 'changed') return 'bg-amber-500/5'
  return ''
}

export function ScopeDiffViewer({ scopeVersions }: { scopeVersions: ProjectScopeVersion[] }) {
  const ordered = useMemo(
    () => [...scopeVersions].sort((a, b) => b.version_number - a.version_number),
    [scopeVersions],
  )

  const defaultTo = ordered[0]?.id ?? ''
  const defaultFrom = ordered[1]?.id ?? ordered[0]?.id ?? ''
  const [fromVersionId, setFromVersionId] = useState(defaultFrom)
  const [toVersionId, setToVersionId] = useState(defaultTo)

  const fromVersion = ordered.find((version) => version.id === fromVersionId) ?? null
  const toVersion = ordered.find((version) => version.id === toVersionId) ?? null

  const sections = useMemo(() => {
    if (!fromVersion || !toVersion) return []
    return [
      { title: 'Resumo', rows: buildLineDiff(fromVersion.summary, toVersion.summary) },
      { title: 'Escopo detalhado', rows: buildLineDiff(fromVersion.scope_body, toVersion.scope_body) },
      { title: 'Premissas', rows: buildLineDiff(fromVersion.assumptions, toVersion.assumptions) },
      { title: 'Exclusoes', rows: buildLineDiff(fromVersion.exclusions, toVersion.exclusions) },
      { title: 'Dependencias', rows: buildLineDiff(fromVersion.dependencies, toVersion.dependencies) },
    ]
  }, [fromVersion, toVersion])

  if (ordered.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Diff visual de escopo</CardTitle>
          <CardDescription>Publique ao menos duas versões para comparar mudanças.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Diff visual de escopo</CardTitle>
        <CardDescription>Compare versões para enxergar adições, remoções e alterações.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Versão base</p>
            <Select value={fromVersionId} onValueChange={setFromVersionId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione versão base" />
              </SelectTrigger>
              <SelectContent>
                {ordered.map((version) => (
                  <SelectItem key={version.id} value={version.id}>
                    V{version.version_number} - {version.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Versão comparada</p>
            <Select value={toVersionId} onValueChange={setToVersionId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione versão comparada" />
              </SelectTrigger>
              <SelectContent>
                {ordered.map((version) => (
                  <SelectItem key={version.id} value={version.id}>
                    V{version.version_number} - {version.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {sections.map((section) => (
          <div key={section.title} className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">{section.title}</h4>
            <div className="overflow-hidden rounded-xl border border-border">
              <div className="grid grid-cols-[120px_1fr_1fr] bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                <span>Status</span>
                <span>Base</span>
                <span>Comparada</span>
              </div>
              <div className="divide-y divide-border">
                {section.rows.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-muted-foreground">Sem conteúdo nas duas versões.</div>
                ) : (
                  section.rows.map((row, index) => (
                    <div
                      key={`${section.title}-${index}`}
                      className={`grid grid-cols-[120px_1fr_1fr] gap-3 px-3 py-2 text-xs ${rowClass(row.kind)}`}
                    >
                      <div className="pt-0.5">{kindBadge(row.kind)}</div>
                      <p className="whitespace-pre-wrap break-words text-muted-foreground">{row.left || '-'}</p>
                      <p className="whitespace-pre-wrap break-words text-foreground">{row.right || '-'}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
