import type { Database } from './database.types'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Client = Database['public']['Tables']['clients']['Row']
export type ClientUser = Database['public']['Tables']['client_users']['Row']
export type Workspace = Database['public']['Tables']['workspaces']['Row']
export type WorkspaceMember = Database['public']['Tables']['workspace_members']['Row']
export type AuditLog = Database['public']['Tables']['audit_logs']['Row']
export type Plan = Database['public']['Tables']['plans']['Row']
export type Subscription = Database['public']['Tables']['subscriptions']['Row']
export type Project = Database['public']['Tables']['projects']['Row']
export type ProjectPhase = Database['public']['Tables']['project_phases']['Row']
export type Task = Database['public']['Tables']['tasks']['Row']
export type Document = Database['public']['Tables']['documents']['Row']
export type Comment = Database['public']['Tables']['comments']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type ProjectActivity = Database['public']['Tables']['project_activities']['Row']
export type ProjectScopeVersion = Database['public']['Tables']['project_scope_versions']['Row']
export type ChangeRequest = Database['public']['Tables']['change_requests']['Row']
export type ChangeRequestItem = Database['public']['Tables']['change_request_items']['Row']
export type Approval = Database['public']['Tables']['approvals']['Row']
export type ApprovalItem = Database['public']['Tables']['approval_items']['Row']
export type TimeEntry = Database['public']['Tables']['time_entries']['Row']
export type TaskDependency = Database['public']['Tables']['task_dependencies']['Row']
export type ProjectRisk = Database['public']['Tables']['project_risks']['Row']
export type TeamCapacity = Database['public']['Tables']['team_capacity']['Row']
export type Contract = Database['public']['Tables']['contracts']['Row']
export type BillingMilestone = Database['public']['Tables']['billing_milestones']['Row']
export type Invoice = Database['public']['Tables']['invoices']['Row']
export type InvoiceEvent = Database['public']['Tables']['invoice_events']['Row']
export type ProjectCostSnapshot = Database['public']['Tables']['project_cost_snapshots']['Row']
export type ProjectMetricsSnapshot = Database['public']['Tables']['project_metrics_snapshots']['Row']
export type DeliveryForecast = Database['public']['Tables']['delivery_forecasts']['Row']

export type ProjectType = 'saas' | 'automation' | 'ai_agent'
export type ProjectStatus = 'active' | 'paused' | 'completed' | 'cancelled'
export type HealthStatus = 'green' | 'yellow' | 'red'
export type PhaseStatus = 'pending' | 'in_progress' | 'completed' | 'blocked'
export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done'
export type TaskOwner = 'agency' | 'client'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export type NotificationSettings = {
  delivery_date_email: boolean
  delivery_date_whatsapp: boolean
  status_change_email: boolean
  status_change_whatsapp: boolean
}

export type ProjectWithClient = Project & {
  clients: Pick<Client, 'id' | 'name' | 'logo_url'>
}

export type TaskWithAssignee = Task & {
  assignee: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
}

export type CommentWithAuthor = Comment & {
  author: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'role'>
}

export type UserRole = 'admin' | 'client'

export type Meeting = Database['public']['Tables']['meetings']['Row']
export type MeetingLocationType = 'meet' | 'local'
export type ChangeRequestStatus = Database['public']['Enums']['change_request_status']
export type ApprovalStatus = Database['public']['Enums']['approval_status']
export type ApprovalKind = Database['public']['Enums']['approval_kind']
export type RiskStatus = Database['public']['Enums']['risk_status']
export type RiskLevel = Database['public']['Enums']['risk_level']
export type ContractType = Database['public']['Enums']['contract_type']
export type BillingMilestoneStatus = Database['public']['Enums']['billing_milestone_status']
export type InvoiceStatus = Database['public']['Enums']['invoice_status']
export type SubscriptionStatus = Database['public']['Enums']['subscription_status']
