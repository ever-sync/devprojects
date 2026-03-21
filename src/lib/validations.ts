import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'Senha deve ter no minimo 6 caracteres'),
})

export const resetPasswordSchema = z.object({
  email: z.string().email('Email invalido'),
})

export const projectSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no minimo 2 caracteres').max(100),
  description: z.string().max(500).optional(),
  type: z.enum(['saas', 'automation', 'ai_agent']),
  client_id: z.string().uuid('Selecione um cliente'),
  health: z.enum(['green', 'yellow', 'red']).optional(),
  status: z.enum(['active', 'paused', 'completed', 'cancelled']).optional(),
  progress_percent: z.number().int().min(0).max(100).optional(),
  start_date: z.string().optional().nullable(),
  target_end_date: z.string().optional().nullable(),
  project_link: z.string().url('URL invalida').optional().or(z.literal('')).nullable(),
  next_steps: z.string().max(1000).optional().nullable(),
  challenges: z.string().max(1000).optional().nullable(),
  scope_definition: z.string().max(20000).optional().nullable(),
})

export const taskSchema = z.object({
  title: z.string().min(2, 'Titulo deve ter no minimo 2 caracteres').max(200),
  description: z.string().max(2000).optional().nullable(),
  status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done']).optional(),
  owner_type: z.enum(['agency', 'client']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  phase_id: z.string().uuid().optional().nullable(),
  assignee_id: z.string().uuid().optional().nullable(),
  due_date: z.string().optional().nullable(),
  estimated_hours: z.number().min(0, 'Invalido').optional().nullable(),
  actual_hours: z.number().min(0, 'Invalido').optional().nullable(),
  remaining_hours: z.number().min(0, 'Invalido').optional().nullable(),
  blocked_reason: z.string().max(1000).optional().nullable(),
  detail_notes: z.string().max(5000).optional().nullable(),
  checklist: z.array(z.object({
    id: z.string(),
    text: z.string().max(300),
    done: z.boolean(),
  })).optional(),
  mentioned_user_ids: z.array(z.string().uuid()).optional(),
  image_path: z.string().max(500).optional().nullable(),
  task_category: z.enum(['saas', 'automation', 'other']).optional(),
})

export const phaseSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no minimo 2 caracteres').max(100),
  description: z.string().max(500).optional().nullable(),
  status: z.enum(['pending', 'in_progress', 'completed', 'blocked']).optional(),
  estimated_start: z.string().optional().nullable(),
  estimated_end: z.string().optional().nullable(),
  actual_start: z.string().optional().nullable(),
  actual_end: z.string().optional().nullable(),
})

export const clientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no minimo 2 caracteres').max(100),
  cnpj: z.string().max(18).optional().nullable(),
  website: z.string().url('URL invalida').optional().or(z.literal('')).nullable(),
  industry: z.string().max(100).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  contact_email: z.string().email('Email invalido').optional().or(z.literal('')).nullable(),
  contact_phone: z.string().max(20).optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  address_number: z.string().max(20).optional().nullable(),
  address_complement: z.string().max(100).optional().nullable(),
  address_neighborhood: z.string().max(100).optional().nullable(),
  address_city: z.string().max(100).optional().nullable(),
  address_state: z.string().max(2).optional().nullable(),
  address_zip: z.string().max(9).optional().nullable(),
  entry_date: z.string().optional().nullable(),
})

export const portalAccessSchema = z.object({
  full_name: z.string().min(2, 'Nome deve ter no minimo 2 caracteres'),
  email: z.string().email('Email invalido'),
  password: z.string().min(8, 'Senha deve ter no minimo 8 caracteres'),
})

export const inviteUserSchema = z.object({
  email: z.string().email('Email invalido'),
  full_name: z.string().min(2, 'Nome deve ter no minimo 2 caracteres'),
  client_id: z.string().uuid('Selecione um cliente'),
})

export const commentSchema = z.object({
  content: z.string().min(1, 'Comentario nao pode ser vazio').max(5000),
  is_internal: z.boolean().optional(),
})

export const scopeVersionSchema = z.object({
  title: z.string().min(2, 'Titulo deve ter no minimo 2 caracteres').max(120),
  summary: z.string().max(1000).optional().nullable(),
  assumptions: z.string().max(3000).optional().nullable(),
  exclusions: z.string().max(3000).optional().nullable(),
  dependencies: z.string().max(3000).optional().nullable(),
  scope_body: z.string().min(10, 'Descreva o escopo com mais detalhes').max(30000),
})

export const projectBaselineSchema = z.object({
  baseline_start_date: z.string().optional().nullable(),
  baseline_end_date: z.string().optional().nullable(),
  baseline_hours: z.number().min(0, 'Invalido').optional().nullable(),
  baseline_value: z.number().min(0, 'Invalido').optional().nullable(),
  contract_value: z.number().min(0, 'Invalido').optional().nullable(),
  margin_percent: z.number().min(0, 'Invalido').max(100, 'Invalido').optional().nullable(),
})

export const changeRequestItemSchema = z.object({
  item_type: z.enum(['scope', 'timeline', 'budget', 'hours']),
  label: z.string().min(2, 'Informe o impacto').max(120),
  old_value: z.string().max(1000).optional().nullable(),
  new_value: z.string().max(1000).optional().nullable(),
})

export const changeRequestSchema = z.object({
  title: z.string().min(2, 'Titulo deve ter no minimo 2 caracteres').max(120),
  description: z.string().min(10, 'Descreva a mudanca').max(4000),
  impact_summary: z.string().max(1000).optional().nullable(),
  requested_deadline: z.string().optional().nullable(),
  items: z.array(changeRequestItemSchema).min(1, 'Adicione pelo menos um impacto'),
})

export const approvalItemSchema = z.object({
  label: z.string().min(2, 'Informe um item').max(160),
  details: z.string().max(1000).optional().nullable(),
})

export const approvalSchema = z.object({
  approval_kind: z.enum(['scope', 'timeline', 'delivery']),
  title: z.string().min(2, 'Titulo deve ter no minimo 2 caracteres').max(120),
  description: z.string().max(2000).optional().nullable(),
  due_date: z.string().optional().nullable(),
  sla_due_at: z.string().optional().nullable(),
  items: z.array(approvalItemSchema).min(1, 'Adicione pelo menos um item'),
})

export const approvalDecisionSchema = z.object({
  approvalId: z.string().uuid(),
  decision: z.enum(['approved', 'revision_requested']),
})

export const timeEntrySchema = z.object({
  task_id: z.string().uuid().optional().nullable(),
  entry_date: z.string(),
  hours: z.number().positive('Horas devem ser maiores que zero').max(24, 'Entrada invalida'),
  notes: z.string().max(1000).optional().nullable(),
})

export const taskDependencySchema = z.object({
  task_id: z.string().uuid(),
  depends_on_task_id: z.string().uuid(),
})

export const projectRiskSchema = z.object({
  title: z.string().min(2, 'Titulo deve ter no minimo 2 caracteres').max(120),
  description: z.string().max(2000).optional().nullable(),
  level: z.enum(['low', 'medium', 'high']).default('medium'),
  status: z.enum(['open', 'mitigating', 'closed']).default('open'),
  owner_id: z.string().uuid().optional().nullable(),
  mitigation_plan: z.string().max(2000).optional().nullable(),
})

export const teamCapacitySchema = z.object({
  user_id: z.string().uuid(),
  week_start: z.string(),
  capacity_hours: z.number().min(0, 'Invalido'),
  allocated_hours: z.number().min(0, 'Invalido'),
  notes: z.string().max(1000).optional().nullable(),
})

export const contractSchema = z.object({
  contract_type: z.enum(['fixed', 'retainer', 'hour_bank', 'sprint']),
  total_value: z.number().min(0, 'Invalido'),
  currency: z.string().min(3).max(3),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  billing_notes: z.string().max(2000).optional().nullable(),
})

export const billingMilestoneSchema = z.object({
  title: z.string().min(2, 'Titulo deve ter no minimo 2 caracteres').max(120),
  description: z.string().max(1000).optional().nullable(),
  due_date: z.string().optional().nullable(),
  amount: z.number().min(0, 'Invalido'),
  status: z.enum(['planned', 'ready', 'invoiced', 'paid']).default('planned'),
})

export const invoiceSchema = z.object({
  billing_milestone_id: z.string().uuid().optional().nullable(),
  invoice_number: z.string().min(2, 'Informe o numero').max(80),
  issue_date: z.string(),
  due_date: z.string().optional().nullable(),
  amount: z.number().min(0, 'Invalido'),
  status: z.enum(['draft', 'issued', 'paid', 'overdue', 'cancelled']).default('draft'),
  notes: z.string().max(2000).optional().nullable(),
})

// Git Integration schemas
export const gitIntegrationSchema = z.object({
  workspaceId: z.string().uuid(),
  provider: z.enum(['github', 'gitlab', 'bitbucket']),
  name: z.string().min(1).max(100),
  oauthToken: z.string().min(1),
  refreshToken: z.string().optional(),
  tokenExpiresAt: z.string().datetime().optional(),
})

export const repositorySchema = z.object({
  projectId: z.string().uuid(),
  integrationId: z.string().uuid(),
  providerRepoId: z.string(),
  repoName: z.string(),
  repoUrl: z.string().url(),
  defaultBranch: z.string().optional(),
  isPrimary: z.boolean().optional(),
  autoLinkBranches: z.boolean().optional(),
  autoLinkPrs: z.boolean().optional(),
  autoLinkCommits: z.boolean().optional(),
})

export const commitSchema = z.object({
  projectId: z.string().uuid(),
  repositoryId: z.string().uuid(),
  taskId: z.string().uuid().optional(),
  commitSha: z.string(),
  commitMessage: z.string(),
  commitUrl: z.string().url(),
  authorName: z.string().optional(),
  authorEmail: z.string().email().optional(),
  authorAvatar: z.string().url().optional(),
  committedAt: z.string(),
  filesChanged: z.number().int().min(0).optional(),
  additions: z.number().int().min(0).optional(),
  deletions: z.number().int().min(0).optional(),
})

export const deploymentSchema = z.object({
  projectId: z.string().uuid(),
  repositoryId: z.string().uuid().optional(),
  environment: z.enum(['development', 'staging', 'production', 'preview']),
  deploymentUrl: z.string().url().optional(),
  status: z.enum(['pending', 'building', 'success', 'failure', 'cancelled']),
  commitSha: z.string().optional(),
  branchName: z.string().optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  durationSeconds: z.number().int().min(0).optional(),
  logsUrl: z.string().url().optional(),
  errorMessage: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
})

export const branchLinkSchema = z.object({
  taskId: z.string().uuid(),
  repositoryId: z.string().uuid(),
  branchName: z.string(),
  prNumber: z.number().int().positive().optional(),
  prUrl: z.string().url().optional(),
  prStatus: z.enum(['open', 'closed', 'merged', 'draft']).optional(),
  prTitle: z.string().optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type ProjectInput = z.infer<typeof projectSchema>
export type TaskInput = z.infer<typeof taskSchema>
export type PhaseInput = z.infer<typeof phaseSchema>
export type ClientInput = z.infer<typeof clientSchema>
export type PortalAccessInput = z.infer<typeof portalAccessSchema>
export type InviteUserInput = z.infer<typeof inviteUserSchema>
export type CommentInput = z.infer<typeof commentSchema>
export type ScopeVersionInput = z.infer<typeof scopeVersionSchema>
export type ProjectBaselineInput = z.infer<typeof projectBaselineSchema>
export type ChangeRequestInput = z.infer<typeof changeRequestSchema>
export type ApprovalInput = z.infer<typeof approvalSchema>
export type ApprovalDecisionInput = z.infer<typeof approvalDecisionSchema>
export type TimeEntryInput = z.infer<typeof timeEntrySchema>
export type TaskDependencyInput = z.infer<typeof taskDependencySchema>
export type ProjectRiskInput = z.infer<typeof projectRiskSchema>
export type TeamCapacityInput = z.infer<typeof teamCapacitySchema>
export type ContractInput = z.infer<typeof contractSchema>
export type BillingMilestoneInput = z.infer<typeof billingMilestoneSchema>
export type InvoiceInput = z.infer<typeof invoiceSchema>
// Git Integration types
export type GitIntegrationInput = z.infer<typeof gitIntegrationSchema>
export type RepositoryInput = z.infer<typeof repositorySchema>
export type CommitInput = z.infer<typeof commitSchema>
export type DeploymentInput = z.infer<typeof deploymentSchema>
export type BranchLinkInput = z.infer<typeof branchLinkSchema>
