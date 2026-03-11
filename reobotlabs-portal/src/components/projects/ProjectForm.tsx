'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { projectSchema, type ProjectInput } from '@/lib/validations'
import { createProject, updateProject, getProjectProgress } from '@/actions/projects'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Client, Project } from '@/types'

interface ProjectFormProps {
  clients: Pick<Client, 'id' | 'name'>[]
  templates?: { id: string; name: string }[]
  project?: Project
  defaultClientId?: string
}

export function ProjectForm({ clients, templates = [], project, defaultClientId }: ProjectFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [templateId, setTemplateId] = useState<string | undefined>()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProjectInput>({
    resolver: zodResolver(projectSchema),
    defaultValues: project
      ? {
          name: project.name,
          description: project.description ?? undefined,
          type: project.type as ProjectInput['type'],
          client_id: project.client_id,
          health: project.health as ProjectInput['health'],
          status: project.status as ProjectInput['status'],
          progress_percent: project.progress_percent,
          start_date: project.start_date ?? undefined,
          target_end_date: project.target_end_date ?? undefined,
          project_link: project.project_link ?? undefined,
          next_steps: project.next_steps ?? undefined,
          challenges: project.challenges ?? undefined,
          scope_definition: project.scope_definition ?? undefined,
        }
      : {
          health: 'green' as ProjectInput['health'],
          status: 'active' as ProjectInput['status'],
          progress_percent: 0,
          client_id: defaultClientId,
        },
  })

  async function onSubmit(data: ProjectInput) {
    setIsLoading(true)
    setError(null)

    const normalizedData = {
      ...data,
      project_link: data.project_link?.trim() ? data.project_link.trim() : null,
    }

    const result = project
      ? await updateProject(project.id, normalizedData)
      : await createProject({ ...normalizedData, templateId })

    if (result?.error) {
      setError(result.error)
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">Nome do Projeto *</Label>
          <Input id="name" placeholder="Ex: Portal E-commerce" {...register('name')} />
          {errors.name && <p className="text-sm text-red-400">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Cliente *</Label>
          <Select
            defaultValue={project?.client_id ?? defaultClientId}
            onValueChange={(v) => setValue('client_id', v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o cliente" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.client_id && <p className="text-sm text-red-400">{errors.client_id.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Tipo de Projeto *</Label>
          <Select
            defaultValue={project?.type}
            onValueChange={(v) => setValue('type', v as ProjectInput['type'])}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="saas">SaaS</SelectItem>
              <SelectItem value="automation">Automacao</SelectItem>
              <SelectItem value="ai_agent">Agente de IA</SelectItem>
            </SelectContent>
          </Select>
          {errors.type && <p className="text-sm text-red-400">{errors.type.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            defaultValue={project?.status ?? 'active'}
            onValueChange={(v) => setValue('status', v as ProjectInput['status'])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="paused">Pausado</SelectItem>
              <SelectItem value="completed">Concluido</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Saude do Projeto</Label>
          <Select
            defaultValue={project?.health ?? 'green'}
            onValueChange={(v) => setValue('health', v as ProjectInput['health'])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="green">Verde - No Prazo</SelectItem>
              <SelectItem value="yellow">Amarelo - Atencao</SelectItem>
              <SelectItem value="red">Vermelho - Critico</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!project && templates.length > 0 && (
          <div className="space-y-2">
            <Label>Template de Fases</Label>
            <Select onValueChange={setTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um template (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              Define as fases iniciais do projeto automaticamente.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="progress_percent">Progresso (%)</Label>
          <div className="flex gap-2">
            <Input
              id="progress_percent"
              type="number"
              min={0}
              max={100}
              {...register('progress_percent', { valueAsNumber: true })}
            />
            {project && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                disabled={isCalculating}
                onClick={async () => {
                  setIsCalculating(true)
                  const result = await getProjectProgress(project.id)
                  setValue('progress_percent', result.percent)
                  setIsCalculating(false)
                }}
              >
                {isCalculating ? '...' : 'Auto'}
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="start_date">Data de Inicio</Label>
          <Input id="start_date" type="date" {...register('start_date')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="target_end_date">Previsao de Entrega</Label>
          <Input id="target_end_date" type="date" {...register('target_end_date')} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="project_link">Link do Projeto</Label>
          <Input
            id="project_link"
            type="url"
            placeholder="https://app.seuprojeto.com.br ou link do ambiente, Figma, Notion..."
            {...register('project_link')}
          />
          <p className="text-[11px] text-muted-foreground">
            Campo opcional. Esse link aparece no painel do cliente para acesso rapido ao projeto.
          </p>
          {errors.project_link && <p className="text-sm text-red-400">{errors.project_link.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descricao</Label>
        <Textarea id="description" rows={2} placeholder="Breve descricao do projeto" {...register('description')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="scope_definition">Escopo do Projeto</Label>
        <Textarea
          id="scope_definition"
          rows={4}
          placeholder="O que esta e o que NAO esta incluido no escopo..."
          {...register('scope_definition')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="next_steps">Proximos Passos desta Semana</Label>
        <Textarea
          id="next_steps"
          rows={3}
          placeholder="O que a equipe esta trabalhando agora..."
          {...register('next_steps')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="challenges">Desafios / Impedimentos</Label>
        <Textarea
          id="challenges"
          rows={3}
          placeholder="Algum bloqueador ou desafio atual..."
          {...register('challenges')}
        />
      </div>

      {error && (
        <div className="rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Salvando...' : project ? 'Atualizar Projeto' : 'Criar Projeto'}
        </Button>
        <Button type="button" variant="outline" onClick={() => history.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
