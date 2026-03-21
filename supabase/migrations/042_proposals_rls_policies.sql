-- Migration 042: RLS Policies for Proposals System
-- Implements Row Level Security for all proposal-related tables

-- Enable RLS on all new tables
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_documents ENABLE ROW LEVEL SECURITY;

-- Proposals policies
CREATE POLICY "Users can view proposals in their workspace"
ON proposals FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = proposals.workspace_id
        AND wm.user_id = auth.uid()
    )
);

CREATE POLICY "Users can create proposals in their workspace"
ON proposals FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = proposals.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin', 'manager')
    )
);

CREATE POLICY "Users can update proposals in their workspace"
ON proposals FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = proposals.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin', 'manager')
    )
);

CREATE POLICY "Users can delete proposals in their workspace"
ON proposals FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = proposals.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
);

-- Proposal phases policies
CREATE POLICY "Users can view proposal phases"
ON proposal_phases FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM proposals p
        JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
        WHERE p.id = proposal_phases.proposal_id
        AND wm.user_id = auth.uid()
    )
);

CREATE POLICY "Users can manage proposal phases"
ON proposal_phases FOR ALL
WITH CHECK (
    EXISTS (
        SELECT 1 FROM proposals p
        JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
        WHERE p.id = proposal_phases.proposal_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin', 'manager')
    )
);

-- Proposal timeline policies
CREATE POLICY "Users can view proposal timeline"
ON proposal_timeline FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM proposals p
        JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
        WHERE p.id = proposal_timeline.proposal_id
        AND wm.user_id = auth.uid()
    )
);

CREATE POLICY "Users can manage proposal timeline"
ON proposal_timeline FOR ALL
WITH CHECK (
    EXISTS (
        SELECT 1 FROM proposals p
        JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
        WHERE p.id = proposal_timeline.proposal_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin', 'manager')
    )
);

-- Proposal resources policies
CREATE POLICY "Users can view proposal resources"
ON proposal_resources FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM proposals p
        JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
        WHERE p.id = proposal_resources.proposal_id
        AND wm.user_id = auth.uid()
    )
);

CREATE POLICY "Users can manage proposal resources"
ON proposal_resources FOR ALL
WITH CHECK (
    EXISTS (
        SELECT 1 FROM proposals p
        JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
        WHERE p.id = proposal_resources.proposal_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin', 'manager')
    )
);

-- Proposal terms policies
CREATE POLICY "Users can view proposal terms"
ON proposal_terms FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM proposals p
        JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
        WHERE p.id = proposal_terms.proposal_id
        AND wm.user_id = auth.uid()
    )
);

CREATE POLICY "Users can manage proposal terms"
ON proposal_terms FOR ALL
WITH CHECK (
    EXISTS (
        SELECT 1 FROM proposals p
        JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
        WHERE p.id = proposal_terms.proposal_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin', 'manager')
    )
);

-- Proposal documents policies
CREATE POLICY "Users can view proposal documents"
ON proposal_documents FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM proposals p
        JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
        WHERE p.id = proposal_documents.proposal_id
        AND wm.user_id = auth.uid()
    )
);

CREATE POLICY "Users can manage proposal documents"
ON proposal_documents FOR ALL
WITH CHECK (
    EXISTS (
        SELECT 1 FROM proposals p
        JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
        WHERE p.id = proposal_documents.proposal_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin', 'manager')
    )
);

-- Client users can view proposals sent to their client
CREATE POLICY "Client users can view their client proposals"
ON proposals FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM client_users cu
        WHERE cu.client_id = proposals.client_id
        AND cu.user_id = auth.uid()
    )
);

-- Allow viewing converted projects linked to proposals
CREATE POLICY "Users can view projects converted from proposals"
ON projects FOR SELECT
USING (
    (converted_from_proposal_id IS NULL) OR
    EXISTS (
        SELECT 1 FROM proposals p
        JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
        WHERE p.id = projects.converted_from_proposal_id
        AND wm.user_id = auth.uid()
    )
);
