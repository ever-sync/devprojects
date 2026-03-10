import type { ProjectType } from '@/types'

export interface PhaseTemplate {
  name: string
  order_index: number
  description?: string
}

export const PHASE_TEMPLATES: Record<ProjectType, PhaseTemplate[]> = {
  saas: [
    { name: 'Scope & Discovery', order_index: 0, description: 'Levantamento de requisitos e definição de escopo' },
    { name: 'Wireframes & Design', order_index: 1, description: 'Protótipos e aprovação de design' },
    { name: 'Backend Development', order_index: 2, description: 'Desenvolvimento de APIs e banco de dados' },
    { name: 'Frontend Development', order_index: 3, description: 'Implementação das interfaces' },
    { name: 'QA & Testing', order_index: 4, description: 'Testes de qualidade e correções' },
    { name: 'Launch & Handover', order_index: 5, description: 'Lançamento e entrega do projeto' },
  ],
  automation: [
    { name: 'Process Mapping', order_index: 0, description: 'Mapeamento e análise dos processos atuais' },
    { name: 'Integration Build', order_index: 1, description: 'Desenvolvimento das integrações' },
    { name: 'Testing & Validation', order_index: 2, description: 'Validação e testes dos fluxos' },
    { name: 'Deploy & Monitor', order_index: 3, description: 'Deploy em produção e monitoramento' },
  ],
  ai_agent: [
    { name: 'Data Collection & Training', order_index: 0, description: 'Coleta e preparação da base de dados' },
    { name: 'Prompt Engineering & Setup', order_index: 1, description: 'Configuração de prompts e fluxos do agente' },
    { name: 'Response Testing & Tuning', order_index: 2, description: 'Testes de respostas e ajustes de comportamento' },
    { name: 'API Integration & Deploy', order_index: 3, description: 'Integração via API e publicação em produção' },
  ],
}

export const PROJECT_TYPE_LABELS: Record<string, string> = {
  saas: 'SaaS',
  automation: 'Automação',
  ai_agent: 'Agente de IA',
}

export const HEALTH_CONFIG: Record<string, { label: string; color: string; bgColor: string; dotColor: string }> = {
  green: { label: 'No Prazo', color: 'text-green-400', bgColor: 'bg-green-500/15', dotColor: 'bg-green-500' },
  yellow: { label: 'Atenção', color: 'text-yellow-400', bgColor: 'bg-yellow-500/15', dotColor: 'bg-yellow-500' },
  red: { label: 'Crítico', color: 'text-red-400', bgColor: 'bg-red-500/15', dotColor: 'bg-red-500' },
}

export const TASK_STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'A Fazer',
  in_progress: 'Em Progresso',
  review: 'Em Revisão',
  done: 'Concluído',
}

export const PHASE_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'text-muted-foreground' },
  in_progress: { label: 'Em Andamento', color: 'text-blue-400' },
  completed: { label: 'Concluído', color: 'text-green-400' },
  blocked: { label: 'Bloqueado', color: 'text-red-400' },
}

export const TASK_PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: 'Baixa', color: 'text-muted-foreground' },
  medium: { label: 'Média', color: 'text-blue-400' },
  high: { label: 'Alta', color: 'text-orange-400' },
  urgent: { label: 'Urgente', color: 'text-red-400' },
}

export const KANBAN_COLUMNS: { id: string; label: string }[] = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'todo', label: 'A Fazer' },
  { id: 'in_progress', label: 'Em Progresso' },
  { id: 'review', label: 'Em Revisão' },
  { id: 'done', label: 'Concluído' },
]
