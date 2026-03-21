-- Migration 041: Proposals and Scope Management System
-- Creates tables for project proposals, scope generation, and conversion to active projects

-- Table: proposals
CREATE TABLE IF NOT EXISTS proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'converted')),
    total_value DECIMAL(12,2) DEFAULT 0,
    currency TEXT DEFAULT 'BRL',
    valid_until TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    converted_to_project_id UUID REFERENCES projects(id),
    template_data JSONB DEFAULT '{}'::jsonb,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    version INTEGER DEFAULT 1
);

-- Table: proposal_phases
CREATE TABLE IF NOT EXISTS proposal_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    phase_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    deliverables TEXT[] DEFAULT ARRAY[]::TEXT[],
    estimated_hours DECIMAL(8,2) DEFAULT 0,
    start_date_offset INTEGER DEFAULT 0, -- Days from proposal acceptance
    duration_days INTEGER DEFAULT 0,
    value DECIMAL(12,2) DEFAULT 0,
    milestone BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0
);

-- Table: proposal_timeline
CREATE TABLE IF NOT EXISTS proposal_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    event_name TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('milestone', 'delivery', 'review', 'meeting', 'deadline')),
    scheduled_date_offset INTEGER NOT NULL, -- Days from proposal acceptance
    description TEXT,
    responsible_role TEXT,
    completed BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0
);

-- Table: proposal_resources
CREATE TABLE IF NOT EXISTS proposal_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('developer', 'designer', 'manager', 'tool', 'service', 'other')),
    role_name TEXT NOT NULL,
    allocated_hours DECIMAL(8,2) DEFAULT 0,
    hourly_rate DECIMAL(10,2),
    total_cost DECIMAL(12,2),
    notes TEXT
);

-- Table: proposal_terms
CREATE TABLE IF NOT EXISTS proposal_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    term_type TEXT NOT NULL CHECK (term_type IN ('payment', 'legal', 'technical', 'other')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
);

-- Table: proposal_documents
CREATE TABLE IF NOT EXISTS proposal_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    document_name TEXT NOT NULL,
    document_type TEXT DEFAULT 'pdf',
    file_path TEXT,
    file_size BIGINT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    generated_html TEXT, -- Stores generated HTML scope
    is_scope_document BOOLEAN DEFAULT false
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_proposals_workspace ON proposals(workspace_id);
CREATE INDEX IF NOT EXISTS idx_proposals_client ON proposals(client_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_created_by ON proposals(created_by);
CREATE INDEX IF NOT EXISTS idx_proposal_phases_proposal ON proposal_phases(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_timeline_proposal ON proposal_timeline(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_resources_proposal ON proposal_resources(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_terms_proposal ON proposal_terms(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_documents_proposal ON proposal_documents(proposal_id);

-- Add conversion tracking to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS converted_from_proposal_id UUID REFERENCES proposals(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS proposal_accepted_at TIMESTAMP WITH TIME ZONE;

COMMENT ON TABLE proposals IS 'Project proposals and scopes before conversion to active projects';
COMMENT ON TABLE proposal_phases IS 'Phases defined in proposals with timelines and deliverables';
COMMENT ON TABLE proposal_timeline IS 'Timeline events and milestones for proposals';
COMMENT ON TABLE proposal_resources IS 'Resource allocation and costing for proposals';
COMMENT ON TABLE proposal_terms IS 'Terms and conditions for proposals';
COMMENT ON TABLE proposal_documents IS 'Documents attached to proposals including generated scopes';
