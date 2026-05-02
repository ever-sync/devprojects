'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { upsertWikiPage } from '@/actions/wiki'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Save, Eye, Pencil } from 'lucide-react'
import type { WikiPage } from '@/actions/wiki'

interface WikiEditorProps {
  page?: WikiPage
  parentPages: Array<{ id: string; title: string; slug: string }>
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function WikiEditor({ page, parentPages }: WikiEditorProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [preview, setPreview] = useState(false)
  const [title, setTitle] = useState(page?.title ?? '')
  const [slug, setSlug] = useState(page?.slug ?? '')
  const [icon, setIcon] = useState(page?.icon ?? '📄')
  const [content, setContent] = useState(page?.content ?? '')
  const [parentId, setParentId] = useState(page?.parent_id ?? '')
  const [slugManual, setSlugManual] = useState(!!page)

  function handleTitleChange(v: string) {
    setTitle(v)
    if (!slugManual) setSlug(slugify(v))
  }

  function handleSave() {
    if (!title.trim() || !slug.trim()) {
      toast.error('Título e slug são obrigatórios.')
      return
    }
    startTransition(async () => {
      const result = await upsertWikiPage({ slug, title, content, icon, parentId: parentId || null })
      if (result.error) { toast.error(result.error); return }
      toast.success('Página salva.')
      router.push(`/wiki/${slug}`)
    })
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Título</Label>
          <Input value={title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Nome da página" />
        </div>
        <div className="space-y-2">
          <Label>Slug</Label>
          <Input
            value={slug}
            onChange={(e) => { setSlugManual(true); setSlug(e.target.value) }}
            placeholder="nome-da-pagina"
            className="font-mono text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Ícone (emoji)</Label>
          <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="📄" className="w-24" maxLength={4} />
        </div>
        {parentPages.length > 0 && (
          <div className="space-y-2">
            <Label>Página pai (opcional)</Label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            >
              <option value="">— Nenhuma (raiz) —</option>
              {parentPages.filter((p) => p.slug !== slug).map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Conteúdo (Markdown)</Label>
          <Button variant="ghost" size="sm" onClick={() => setPreview(!preview)} className="gap-1 text-xs">
            {preview ? <Pencil className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {preview ? 'Editar' : 'Preview'}
          </Button>
        </div>
        {preview ? (
          <div className="prose prose-sm dark:prose-invert max-w-none min-h-[300px] rounded-md border border-input bg-muted/30 p-4 text-sm">
            <pre className="whitespace-pre-wrap font-sans text-foreground">{content || '(sem conteúdo)'}</pre>
          </div>
        ) : (
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="# Título da seção&#10;&#10;Escreva o conteúdo em Markdown..."
            className="min-h-[300px] font-mono text-sm resize-y"
          />
        )}
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={isPending} className="gap-2">
          <Save className="h-4 w-4" />
          {isPending ? 'Salvando...' : 'Salvar página'}
        </Button>
        <Button variant="outline" onClick={() => router.back()}>Cancelar</Button>
      </div>
    </div>
  )
}
