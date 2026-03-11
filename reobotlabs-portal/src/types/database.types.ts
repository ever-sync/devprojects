// Este arquivo será substituído pelo gerado via: supabase gen types typescript --project-id <id>
// Versão manual compatível com @supabase/supabase-js 2.97+

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          email: string
          avatar_url: string | null
          role: string
          company: string | null
          phone: string | null
          hour_cost: number | null
          bill_rate: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string
          email: string
          avatar_url?: string | null
          role?: string
          company?: string | null
          phone?: string | null
          hour_cost?: number | null
          bill_rate?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          full_name?: string
          email?: string
          avatar_url?: string | null
          role?: string
          company?: string | null
          phone?: string | null
          hour_cost?: number | null
          bill_rate?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          id: string
          name: string
          logo_url: string | null
          website: string | null
          industry: string | null
          notes: string | null
          cnpj: string | null
          contact_email: string | null
          contact_phone: string | null
          address: string | null
          address_number: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_city: string | null
          address_state: string | null
          address_zip: string | null
          entry_date: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          notification_settings: Json
          workspace_id: string
        }
        Insert: {
          id?: string
          name: string
          logo_url?: string | null
          website?: string | null
          industry?: string | null
          notes?: string | null
          cnpj?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          address?: string | null
          address_number?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_city?: string | null
          address_state?: string | null
          address_zip?: string | null
          entry_date?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          notification_settings?: Json
          workspace_id: string
        }
        Update: {
          name?: string
          logo_url?: string | null
          website?: string | null
          industry?: string | null
          notes?: string | null
          cnpj?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          address?: string | null
          address_number?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_city?: string | null
          address_state?: string | null
          address_zip?: string | null
          entry_date?: string | null
          updated_at?: string
          notification_settings?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      client_users: {
        Row: {
          id: string
          user_id: string
          client_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          client_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          client_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          }
        ]
      }
      workspaces: {
        Row: {
          id: string
          name: string
          slug: string
          owner_user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          owner_user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          slug?: string
          owner_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      workspace_members: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          role?: string
          created_at?: string
        }
        Update: {
          workspace_id?: string
          user_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      audit_logs: {
        Row: {
          id: string
          workspace_id: string | null
          actor_user_id: string | null
          entity_type: string
          entity_id: string | null
          action: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          actor_user_id?: string | null
          entity_type: string
          entity_id?: string | null
          action: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          workspace_id?: string | null
          actor_user_id?: string | null
          entity_type?: string
          entity_id?: string | null
          action?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      plans: {
        Row: {
          id: string
          key: string
          name: string
          description: string | null
          price_monthly_brl: number
          project_limit: number | null
          member_limit: number | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          name: string
          description?: string | null
          price_monthly_brl?: number
          project_limit?: number | null
          member_limit?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          key?: string
          name?: string
          description?: string | null
          price_monthly_brl?: number
          project_limit?: number | null
          member_limit?: number | null
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          workspace_id: string
          plan_id: string
          status: Database['public']['Enums']['subscription_status']
          seats: number
          current_period_start: string
          current_period_end: string | null
          cancel_at_period_end: boolean
          external_customer_id: string | null
          external_subscription_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          plan_id: string
          status?: Database['public']['Enums']['subscription_status']
          seats?: number
          current_period_start?: string
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          external_customer_id?: string | null
          external_subscription_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          workspace_id?: string
          plan_id?: string
          status?: Database['public']['Enums']['subscription_status']
          seats?: number
          current_period_start?: string
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          external_customer_id?: string | null
          external_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          }
        ]
      }
      projects: {
        Row: {
          id: string
          client_id: string
          name: string
          description: string | null
          type: string
          status: string
          health: string
          progress_percent: number
          start_date: string | null
          target_end_date: string | null
          actual_end_date: string | null
            next_steps: string | null
            challenges: string | null
            scope_definition: string | null
            project_link: string | null
            created_by: string | null
          created_at: string
          updated_at: string
          public_token: string | null
          public_enabled: boolean
          baseline_start_date: string | null
          baseline_end_date: string | null
          baseline_hours: number | null
          baseline_value: number | null
          margin_percent: number | null
          contract_value: number | null
          scope_document_id: string | null
          scope_version_current_id: string | null
          workspace_id: string
        }
        Insert: {
          id?: string
          client_id: string
          name: string
          description?: string | null
          type: string
          status?: string
          health?: string
          progress_percent?: number
          start_date?: string | null
          target_end_date?: string | null
          actual_end_date?: string | null
            next_steps?: string | null
            challenges?: string | null
            scope_definition?: string | null
            project_link?: string | null
            created_by?: string | null
          created_at?: string
          updated_at?: string
          public_token?: string | null
          public_enabled?: boolean
          baseline_start_date?: string | null
          baseline_end_date?: string | null
          baseline_hours?: number | null
          baseline_value?: number | null
          margin_percent?: number | null
          contract_value?: number | null
          scope_document_id?: string | null
          scope_version_current_id?: string | null
          workspace_id: string
        }
        Update: {
          name?: string
          description?: string | null
          type?: string
          status?: string
          health?: string
          progress_percent?: number
          start_date?: string | null
          target_end_date?: string | null
          actual_end_date?: string | null
            next_steps?: string | null
            challenges?: string | null
            scope_definition?: string | null
            project_link?: string | null
            updated_at?: string
          public_token?: string | null
          public_enabled?: boolean
          baseline_start_date?: string | null
          baseline_end_date?: string | null
          baseline_hours?: number | null
          baseline_value?: number | null
          margin_percent?: number | null
          contract_value?: number | null
          scope_document_id?: string | null
          scope_version_current_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_scope_document_id_fkey"
            columns: ["scope_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_scope_version_current_id_fkey"
            columns: ["scope_version_current_id"]
            isOneToOne: false
            referencedRelation: "project_scope_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          }
        ]
      }
      project_phases: {
        Row: {
          id: string
          project_id: string
          name: string
          description: string | null
          order_index: number
          status: string
          estimated_start: string | null
          estimated_end: string | null
          actual_start: string | null
          actual_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          description?: string | null
          order_index?: number
          status?: string
          estimated_start?: string | null
          estimated_end?: string | null
          actual_start?: string | null
          actual_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          description?: string | null
          order_index?: number
          status?: string
          estimated_start?: string | null
          estimated_end?: string | null
          actual_start?: string | null
          actual_end?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      tasks: {
        Row: {
          id: string
          project_id: string
          phase_id: string | null
          title: string
          description: string | null
          status: string
          owner_type: string
          priority: string
          assignee_id: string | null
          due_date: string | null
          order_index: number
          created_by: string | null
          created_at: string
          updated_at: string
          estimated_hours: number | null
          actual_hours: number | null
          blocked_reason: string | null
          blocked_since: string | null
          remaining_hours: number | null
          detail_notes: string | null
          checklist: Json
          mentioned_user_ids: string[]
          image_path: string | null
          task_category: string
        }
        Insert: {
          id?: string
          project_id: string
          phase_id?: string | null
          title: string
          description?: string | null
          status?: string
          owner_type?: string
          priority?: string
          assignee_id?: string | null
          due_date?: string | null
          order_index?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
          estimated_hours?: number | null
          actual_hours?: number | null
          blocked_reason?: string | null
          blocked_since?: string | null
          remaining_hours?: number | null
          detail_notes?: string | null
          checklist?: Json
          mentioned_user_ids?: string[]
          image_path?: string | null
          task_category?: string
        }
        Update: {
          phase_id?: string | null
          title?: string
          description?: string | null
          status?: string
          owner_type?: string
          priority?: string
          assignee_id?: string | null
          due_date?: string | null
          order_index?: number
          updated_at?: string
          estimated_hours?: number | null
          actual_hours?: number | null
          blocked_reason?: string | null
          blocked_since?: string | null
          remaining_hours?: number | null
          detail_notes?: string | null
          checklist?: Json
          mentioned_user_ids?: string[]
          image_path?: string | null
          task_category?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      documents: {
        Row: {
          id: string
          project_id: string | null
          client_id: string
          name: string
          file_path: string
          file_size: number | null
          mime_type: string | null
          doc_type: 'contract' | 'proposal' | 'invoice' | 'boleto' | 'design' | 'report' | 'other'
          uploaded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id?: string | null
          client_id: string
          name: string
          file_path: string
          file_size?: number | null
          mime_type?: string | null
          doc_type?: 'contract' | 'proposal' | 'invoice' | 'boleto' | 'design' | 'report' | 'other'
          uploaded_by?: string | null
          created_at?: string
        }
        Update: {
          name?: string
          doc_type?: 'contract' | 'proposal' | 'invoice' | 'boleto' | 'design' | 'report' | 'other'
        }
        Relationships: [
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          }
        ]
      }
      comments: {
        Row: {
          id: string
          project_id: string
          task_id: string | null
          author_id: string
          content: string
          is_internal: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          task_id?: string | null
          author_id: string
          content: string
          is_internal?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          content?: string
          is_internal?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          body: string | null
          channel: string
          status: string
          read_at: string | null
          payload: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          body?: string | null
          channel?: string
          status?: string
          read_at?: string | null
          payload?: Json | null
          created_at?: string
        }
        Update: {
          status?: string
          read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      project_activities: {
        Row: {
          id: string
          project_id: string
          user_id: string
          action: Database['public']['Enums']['activity_action']
          old_value: string | null
          new_value: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          action: Database['public']['Enums']['activity_action']
          old_value?: string | null
          new_value?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          action?: Database['public']['Enums']['activity_action']
          old_value?: string | null
          new_value?: string | null
          metadata?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      project_scope_versions: {
        Row: {
          id: string
          project_id: string
          version_number: number
          title: string
          summary: string | null
          assumptions: string | null
          exclusions: string | null
          dependencies: string | null
          scope_body: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          version_number: number
          title: string
          summary?: string | null
          assumptions?: string | null
          exclusions?: string | null
          dependencies?: string | null
          scope_body: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          title?: string
          summary?: string | null
          assumptions?: string | null
          exclusions?: string | null
          dependencies?: string | null
          scope_body?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_scope_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_scope_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      change_requests: {
        Row: {
          id: string
          project_id: string
          requested_by: string | null
          title: string
          description: string
          impact_summary: string | null
          status: Database['public']['Enums']['change_request_status']
          requested_deadline: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          requested_by?: string | null
          title: string
          description: string
          impact_summary?: string | null
          status?: Database['public']['Enums']['change_request_status']
          requested_deadline?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          description?: string
          impact_summary?: string | null
          status?: Database['public']['Enums']['change_request_status']
          requested_deadline?: string | null
          approved_at?: string | null
          approved_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      change_request_items: {
        Row: {
          id: string
          change_request_id: string
          item_type: string
          label: string
          old_value: string | null
          new_value: string | null
          created_at: string
        }
        Insert: {
          id?: string
          change_request_id: string
          item_type: string
          label: string
          old_value?: string | null
          new_value?: string | null
          created_at?: string
        }
        Update: {
          item_type?: string
          label?: string
          old_value?: string | null
          new_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_request_items_change_request_id_fkey"
            columns: ["change_request_id"]
            isOneToOne: false
            referencedRelation: "change_requests"
            referencedColumns: ["id"]
          }
        ]
      }
      approvals: {
        Row: {
          id: string
          project_id: string
          requested_by: string | null
          approval_kind: Database['public']['Enums']['approval_kind']
          title: string
          description: string | null
          status: Database['public']['Enums']['approval_status']
          due_date: string | null
          approved_at: string | null
          approved_by: string | null
          sla_due_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          requested_by?: string | null
          approval_kind: Database['public']['Enums']['approval_kind']
          title: string
          description?: string | null
          status?: Database['public']['Enums']['approval_status']
          due_date?: string | null
          approved_at?: string | null
          approved_by?: string | null
          sla_due_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          approval_kind?: Database['public']['Enums']['approval_kind']
          title?: string
          description?: string | null
          status?: Database['public']['Enums']['approval_status']
          due_date?: string | null
          approved_at?: string | null
          approved_by?: string | null
          sla_due_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approvals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      approval_items: {
        Row: {
          id: string
          approval_id: string
          label: string
          details: string | null
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          approval_id: string
          label: string
          details?: string | null
          sort_order?: number
          created_at?: string
        }
        Update: {
          label?: string
          details?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "approval_items_approval_id_fkey"
            columns: ["approval_id"]
            isOneToOne: false
            referencedRelation: "approvals"
            referencedColumns: ["id"]
          }
        ]
      }
      time_entries: {
        Row: {
          id: string
          project_id: string
          task_id: string | null
          user_id: string
          entry_date: string
          hours: number
          notes: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          task_id?: string | null
          user_id: string
          entry_date?: string
          hours: number
          notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          task_id?: string | null
          entry_date?: string
          hours?: number
          notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      task_dependencies: {
        Row: {
          id: string
          task_id: string
          depends_on_task_id: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          depends_on_task_id: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          task_id?: string
          depends_on_task_id?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_dependencies_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_depends_on_task_id_fkey"
            columns: ["depends_on_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      project_risks: {
        Row: {
          id: string
          project_id: string
          title: string
          description: string | null
          status: Database['public']['Enums']['risk_status']
          level: Database['public']['Enums']['risk_level']
          owner_id: string | null
          mitigation_plan: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          description?: string | null
          status?: Database['public']['Enums']['risk_status']
          level?: Database['public']['Enums']['risk_level']
          owner_id?: string | null
          mitigation_plan?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          description?: string | null
          status?: Database['public']['Enums']['risk_status']
          level?: Database['public']['Enums']['risk_level']
          owner_id?: string | null
          mitigation_plan?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_risks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_risks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_risks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      team_capacity: {
        Row: {
          id: string
          user_id: string
          week_start: string
          capacity_hours: number
          allocated_hours: number
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          week_start: string
          capacity_hours: number
          allocated_hours?: number
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          week_start?: string
          capacity_hours?: number
          allocated_hours?: number
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_capacity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_capacity_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      contracts: {
        Row: {
          id: string
          project_id: string
          contract_type: Database['public']['Enums']['contract_type']
          total_value: number
          currency: string
          start_date: string | null
          end_date: string | null
          billing_notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          contract_type?: Database['public']['Enums']['contract_type']
          total_value?: number
          currency?: string
          start_date?: string | null
          end_date?: string | null
          billing_notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          contract_type?: Database['public']['Enums']['contract_type']
          total_value?: number
          currency?: string
          start_date?: string | null
          end_date?: string | null
          billing_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      billing_milestones: {
        Row: {
          id: string
          project_id: string
          contract_id: string | null
          title: string
          description: string | null
          due_date: string | null
          amount: number
          status: Database['public']['Enums']['billing_milestone_status']
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          contract_id?: string | null
          title: string
          description?: string | null
          due_date?: string | null
          amount?: number
          status?: Database['public']['Enums']['billing_milestone_status']
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          contract_id?: string | null
          title?: string
          description?: string | null
          due_date?: string | null
          amount?: number
          status?: Database['public']['Enums']['billing_milestone_status']
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_milestones_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_milestones_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      invoices: {
        Row: {
          id: string
          project_id: string
          contract_id: string | null
          billing_milestone_id: string | null
          invoice_number: string
          issue_date: string
          due_date: string | null
          amount: number
          status: Database['public']['Enums']['invoice_status']
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          contract_id?: string | null
          billing_milestone_id?: string | null
          invoice_number: string
          issue_date: string
          due_date?: string | null
          amount?: number
          status?: Database['public']['Enums']['invoice_status']
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          contract_id?: string | null
          billing_milestone_id?: string | null
          invoice_number?: string
          issue_date?: string
          due_date?: string | null
          amount?: number
          status?: Database['public']['Enums']['invoice_status']
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_billing_milestone_id_fkey"
            columns: ["billing_milestone_id"]
            isOneToOne: false
            referencedRelation: "billing_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      invoice_events: {
        Row: {
          id: string
          invoice_id: string
          event_type: string
          description: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          event_type: string
          description?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          event_type?: string
          description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_events_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      project_cost_snapshots: {
        Row: {
          id: string
          project_id: string
          logged_hours: number
          internal_cost: number
          recognized_revenue: number
          gross_margin: number
          snapshot_date: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          logged_hours?: number
          internal_cost?: number
          recognized_revenue?: number
          gross_margin?: number
          snapshot_date?: string
          created_at?: string
        }
        Update: {
          logged_hours?: number
          internal_cost?: number
          recognized_revenue?: number
          gross_margin?: number
          snapshot_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_cost_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      project_metrics_snapshots: {
        Row: {
          id: string
          project_id: string
          snapshot_date: string
          health_score: number
          blocked_tasks_count: number
          pending_approvals_count: number
          open_risks_count: number
          overdue_tasks_count: number
          workload_alert: boolean
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          snapshot_date?: string
          health_score?: number
          blocked_tasks_count?: number
          pending_approvals_count?: number
          open_risks_count?: number
          overdue_tasks_count?: number
          workload_alert?: boolean
          created_at?: string
        }
        Update: {
          snapshot_date?: string
          health_score?: number
          blocked_tasks_count?: number
          pending_approvals_count?: number
          open_risks_count?: number
          overdue_tasks_count?: number
          workload_alert?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "project_metrics_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      delivery_forecasts: {
        Row: {
          id: string
          project_id: string
          forecast_date: string
          projected_completion_date: string | null
          projected_delay_days: number
          confidence_score: number
          rationale: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          forecast_date?: string
          projected_completion_date?: string | null
          projected_delay_days?: number
          confidence_score?: number
          rationale?: string | null
          created_at?: string
        }
        Update: {
          forecast_date?: string
          projected_completion_date?: string | null
          projected_delay_days?: number
          confidence_score?: number
          rationale?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_forecasts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      phase_templates: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      phase_template_items: {
        Row: {
          id: string
          template_id: string
          name: string
          description: string | null
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          template_id: string
          name: string
          description?: string | null
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          template_id?: string
          name?: string
          description?: string | null
          order_index?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "phase_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "phase_templates"
            referencedColumns: ["id"]
          }
        ]
      }
      meetings: {
        Row: {
          id: string
          title: string
          description: string | null
          client_id: string | null
          project_id: string | null
          scheduled_date: string
          scheduled_time: string
          location_type: 'meet' | 'local'
          location_url: string | null
          location_address: string | null
          invitees: Json
          minutes: string | null
          minutes_summary: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          client_id?: string | null
          project_id?: string | null
          scheduled_date: string
          scheduled_time: string
          location_type?: 'meet' | 'local'
          location_url?: string | null
          location_address?: string | null
          invitees?: Json
          minutes?: string | null
          minutes_summary?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          description?: string | null
          client_id?: string | null
          project_id?: string | null
          scheduled_date?: string
          scheduled_time?: string
          location_type?: 'meet' | 'local'
          location_url?: string | null
          location_address?: string | null
          invitees?: Json
          minutes?: string | null
          minutes_summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_client_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      project_type: 'saas' | 'automation' | 'ai_agent'
      project_status: 'active' | 'paused' | 'completed' | 'cancelled'
      health_status: 'green' | 'yellow' | 'red'
      phase_status: 'pending' | 'in_progress' | 'completed' | 'blocked'
      task_status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done'
      task_owner: 'agency' | 'client'
      task_priority: 'low' | 'medium' | 'high' | 'urgent'
      document_type: 'contract' | 'proposal' | 'invoice' | 'boleto' | 'design' | 'report' | 'other'
      notification_channel: 'in_app' | 'email' | 'whatsapp'
      notification_status: 'pending' | 'sent' | 'failed'
      meeting_location_type: 'meet' | 'local'
      activity_action: 'status_changed' | 'health_changed' | 'phase_updated' | 'created' | 'deleted'
      change_request_status: 'draft' | 'submitted' | 'approved' | 'rejected'
      approval_status: 'pending' | 'approved' | 'revision_requested'
      approval_kind: 'scope' | 'timeline' | 'delivery'
      risk_status: 'open' | 'mitigating' | 'closed'
      risk_level: 'low' | 'medium' | 'high'
      contract_type: 'fixed' | 'retainer' | 'hour_bank' | 'sprint'
      billing_milestone_status: 'planned' | 'ready' | 'invoiced' | 'paid'
      invoice_status: 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled'
      subscription_status: 'trialing' | 'active' | 'past_due' | 'canceled'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ---- App-level types derived from database ----

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Client = Database['public']['Tables']['clients']['Row']
export type ProjectRow = Database['public']['Tables']['projects']['Row']
export type ProjectPhaseRow = Database['public']['Tables']['project_phases']['Row']
export type TaskRow = Database['public']['Tables']['tasks']['Row']
export type DocumentRow2 = Database['public']['Tables']['documents']['Row']
export type CommentRow = Database['public']['Tables']['comments']['Row']
export type ProjectActivityRow = Database['public']['Tables']['project_activities']['Row']
