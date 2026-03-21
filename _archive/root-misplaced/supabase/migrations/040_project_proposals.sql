-- Tabela para armazenar propostas/escopos de projetos
CREATE TABLE IF NOT EXISTS project_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  client_name TEXT NOT NULL,
  client_email TEXT,
  status proposal_status DEFAULT 'draft',
  total_value DECIMAL(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'BRL',
  valid_until DATE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  template_data JSONB DEFAULT '{}'::jsonb,
  pdf_url TEXT,
  public_share_token TEXT UNIQUE,
  version INTEGER DEFAULT 1
);

-- Tabela para fases do projeto na proposta
CREATE TABLE IF NOT EXISTS proposal_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES project_proposals(id) ON DELETE CASCADE,
  phase_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  deliverables JSONB DEFAULT '[]'::jsonb,
  estimated_hours INTEGER DEFAULT 0,
  start_date DATE,
  end_date DATE,
  value DECIMAL(12,2) DEFAULT 0,
  percentage_of_total DECIMAL(5,2) DEFAULT 0,
  dependencies INTEGER[] DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para itens/inclusões da proposta
CREATE TABLE IF NOT EXISTS proposal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES project_proposals(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'development', 'design', 'infrastructure', etc.
  title TEXT NOT NULL,
  description TEXT,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(12,2) DEFAULT 0,
  total_price DECIMAL(12,2) DEFAULT 0,
  is_optional BOOLEAN DEFAULT FALSE,
  included BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para termos e condições
CREATE TABLE IF NOT EXISTS proposal_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES project_proposals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para histórico de versões da proposta
CREATE TABLE IF NOT EXISTS proposal_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES project_proposals(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  changes_summary TEXT,
  snapshot_data JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enum para status da proposta
DO $$ BEGIN
  CREATE TYPE proposal_status AS ENUM ('draft', 'sent', 'viewed', 'negotiating', 'approved', 'rejected', 'expired', 'converted');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_proposals_workspace ON project_proposals(workspace_id);
CREATE INDEX IF NOT EXISTS idx_proposals_project ON project_proposals(project_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON project_proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_client ON project_proposals(client_email);
CREATE INDEX IF NOT EXISTS idx_proposal_phases_proposal ON proposal_phases(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_items_proposal ON proposal_items(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_terms_proposal ON proposal_terms(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_versions_proposal ON proposal_versions(proposal_id);

-- Comentários nas tabelas
COMMENT ON TABLE project_proposals IS 'Propostas e escopos de projetos enviados a clientes';
COMMENT ON TABLE proposal_phases IS 'Fases e cronograma detalhado da proposta';
COMMENT ON TABLE proposal_items IS 'Itens discriminados na proposta (desenvolvimento, design, etc)';
COMMENT ON TABLE proposal_terms IS 'Termos e condições contratuais da proposta';
COMMENT ON TABLE proposal_versions IS 'Histórico de versões e alterações da proposta';
