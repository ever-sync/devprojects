'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, Save, Layout, ListChecks } from 'lucide-react'
import { toast } from 'sonner'
import { createTemplate, updateTemplate, deleteTemplate } from '@/actions/templates'

interface TemplateItem {
  id?: string
  name: string
}

interface Template {
  id: string
  name: string
  description: string | null
  phase_template_items: TemplateItem[]
}

interface TemplateManagementProps {
  initialTemplates: Template[]
}

export function TemplateManagement({ initialTemplates }: TemplateManagementProps) {
  const [templates, setTemplates] = useState(initialTemplates)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [loading, setLoading] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [items, setItems] = useState<string[]>([])

  function resetForm() {
    setName('')
    setDescription('')
    setItems([''])
    setEditingId(null)
    setIsCreating(false)
  }

  function startEdit(template: Template) {
    setName(template.name)
    setDescription(template.description ?? '')
    setItems(template.phase_template_items.map(i => i.name))
    setEditingId(template.id)
    setIsCreating(false)
  }

  async function handleSave() {
    if (!name || items.filter(i => i.trim()).length === 0) {
      toast.error('Nome e pelo menos uma fase são obrigatórios')
      return
    }

    setLoading(true)
    const filteredItems = items.filter(i => i.trim())
    
    const res = editingId 
      ? await updateTemplate(editingId, { name, description, items: filteredItems })
      : await createTemplate({ name, description, items: filteredItems })

    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success(editingId ? 'Template atualizado' : 'Template criado')
      // Refresh list (simplified)
      window.location.reload()
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este template?')) return
    
    setLoading(true)
    const res = await deleteTemplate(id)
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success('Template excluído')
      setTemplates(templates.filter(t => t.id !== id))
    }
    setLoading(false)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* List */}
      <div className="md:col-span-1 space-y-4">
        <Button 
          className="w-full justify-start gap-2" 
          variant={isCreating ? 'secondary' : 'outline'}
          onClick={() => {
            resetForm()
            setIsCreating(true)
          }}
        >
          <Plus className="w-4 h-4" />
          Novo Template
        </Button>

        <div className="space-y-2">
          {templates.map((template) => (
            <div 
              key={template.id}
              className={`p-3 rounded-lg border transition-all cursor-pointer group ${
                editingId === template.id ? 'bg-primary/10 border-primary' : 'bg-card border-border hover:border-primary/50'
              }`}
              onClick={() => startEdit(template)}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 overflow-hidden">
                  <Layout className="w-4 h-4 shrink-0 text-muted-foreground" />
                  <span className="font-medium truncate">{template.name}</span>
                </div>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 hover:bg-red-500/10"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(template.id)
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">
                {template.phase_template_items.length} fases • {template.description || 'Sem descrição'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="md:col-span-2">
        {editingId || isCreating ? (
          <div className="bg-card border border-border rounded-xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Layout className="w-5 h-5 text-primary" />
                {editingId ? 'Editar Template' : 'Novo Template'}
              </h3>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={resetForm}>Cancelar</Button>
                <Button size="sm" onClick={handleSave} disabled={loading} className="gap-2">
                  <Save className="w-4 h-4" />
                  {loading ? 'Salvando...' : 'Salvar Template'}
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Template</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Projeto Padrão SaaS" />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Breve explicação do uso deste template..." rows={2} />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-primary" />
                  Fases do Projeto
                </Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="h-8 gap-1.5"
                  onClick={() => setItems([...items, ''])}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar Fase
                </Button>
              </div>

              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="flex items-center justify-center w-8 h-9 text-xs font-mono text-muted-foreground bg-muted/50 rounded-md shrink-0">
                      {index + 1}
                    </div>
                    <Input 
                      value={item} 
                      onChange={e => {
                        const newItems = [...items]
                        newItems[index] = e.target.value
                        setItems(newItems)
                      }}
                      placeholder={`Nome da fase ${index + 1}`}
                      className="flex-1"
                    />
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      disabled={items.length <= 1}
                      className="h-9 w-9 text-muted-foreground hover:text-red-500"
                      onClick={() => setItems(items.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border border-dashed rounded-xl p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Layout className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Gerenciador de Templates</h3>
              <p className="text-sm text-muted-foreground">Selecione um template ao lado para editar ou crie um novo.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsCreating(true)}>Começar agora</Button>
          </div>
        )}
      </div>
    </div>
  )
}
