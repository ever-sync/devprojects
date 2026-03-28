-- Migration 037: AI Features, Contracts & PDF Generation
-- Cria tabelas para geração de contratos, escopos em PDF, análise de processos e integração com IA

-- Tabela para templates de contratos
CREATE TABLE IF NOT EXISTS contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  template_type VARCHAR(50) NOT NULL DEFAULT 'service_agreement', -- service_agreement, proposal, sOW, nda
  content_html TEXT NOT NULL,
  content_markdown TEXT,
  variables_schema JSONB DEFAULT '{}', -- Schema dos campos dinâmicos
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para contratos gerados
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  template_id UUID REFERENCES contract_templates(id),
  title VARCHAR(300) NOT NULL,
  contract_number VARCHAR(50),
  status VARCHAR(50) DEFAULT 'draft', -- draft, pending_signature, signed, expired, cancelled
  client_name VARCHAR(200) NOT NULL,
  client_email VARCHAR(200),
  client_cnpj VARCHAR(20),
  company_name VARCHAR(200),
  company_cnpj VARCHAR(20),
  contract_value DECIMAL(12,2),
  start_date DATE,
  end_date DATE,
  auto_renewal BOOLEAN DEFAULT false,
  renewal_period_days INTEGER,
  payment_terms TEXT,
  scope_summary TEXT,
  variables_data JSONB DEFAULT '{}', -- Dados preenchidos das variáveis
  pdf_path VARCHAR(500), -- Caminho do PDF no storage
  pdf_url VARCHAR(500), -- URL pública do PDF
  signed_at TIMESTAMPTZ,
  signed_by VARCHAR(200),
  signature_provider VARCHAR(50), -- docuSign, adobe_sign, manual
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para assinaturas de contrato
CREATE TABLE IF NOT EXISTS contract_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  signer_name VARCHAR(200) NOT NULL,
  signer_email VARCHAR(200) NOT NULL,
  signer_role VARCHAR(100), -- client, company, witness
  sign_order INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'pending', -- pending, signed, declined, expired
  signed_at TIMESTAMPTZ,
  ip_address INET,
  signature_image_path VARCHAR(500),
  signature_provider_id VARCHAR(200), -- ID externo do provedor de assinatura
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para documentos PDF gerados (escopos, propostas, etc)
CREATE TABLE IF NOT EXISTS generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL, -- scope_pdf, proposal_pdf, invoice_pdf, report_pdf
  title VARCHAR(300) NOT NULL,
  description TEXT,
  file_path VARCHAR(500) NOT NULL,
  file_url VARCHAR(500),
  file_size_bytes BIGINT,
  page_count INTEGER,
  generated_by_ai BOOLEAN DEFAULT false,
  ai_model_used VARCHAR(100),
  ai_prompt_used TEXT,
  version INTEGER DEFAULT 1,
  is_latest BOOLEAN DEFAULT true,
  download_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para análise de processos com IA
CREATE TABLE IF NOT EXISTS process_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  analysis_type VARCHAR(50) NOT NULL, -- bottleneck_detection, risk_analysis, efficiency_report
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
  ai_model_used VARCHAR(100),
  input_data JSONB, -- Dados de entrada para análise
  findings JSONB, -- Resultados da análise
  recommendations JSONB, -- Recomendações geradas
  risk_score DECIMAL(5,2), -- Score de risco 0-100
  efficiency_score DECIMAL(5,2), -- Score de eficiência 0-100
  predicted_delay_days INTEGER,
  detected_bottlenecks JSONB,
  summary TEXT,
  full_report_path VARCHAR(500),
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Tabela para tarefas geradas por IA
CREATE TABLE IF NOT EXISTS ai_generated_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES project_phases(id) ON DELETE SET NULL,
  source_type VARCHAR(50) NOT NULL, -- meeting_transcript, document_analysis, github_analysis, user_prompt
  source_id VARCHAR(200), -- ID da fonte original (meeting_id, document_id, etc)
  original_input TEXT NOT NULL, -- Texto/entrada original que gerou as tarefas
  ai_model_used VARCHAR(100),
  suggested_tasks JSONB NOT NULL, -- Array de tarefas sugeridas
  processing_status VARCHAR(50) DEFAULT 'pending', -- pending, processed, partially_processed, failed
  accepted_task_ids UUID[], -- IDs das tarefas aceitas e criadas
  rejected_task_ids UUID[], -- IDs das tarefas rejeitadas
  confidence_score DECIMAL(5,2), -- Confiança da IA nas sugestões 0-100
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Tabela para análise de repositórios GitHub com IA
CREATE TABLE IF NOT EXISTS github_ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID REFERENCES project_repositories(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  analysis_type VARCHAR(50) NOT NULL, -- code_quality, security_audit, tech_debt, pr_review, commit_analysis
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
  ai_model_used VARCHAR(100),
  github_data JSONB, -- Dados brutos do GitHub
  analysis_results JSONB, -- Resultados da análise
  code_quality_score DECIMAL(5,2),
  security_issues JSONB,
  tech_debt_items JSONB,
  suggested_refactorings JSONB,
  commit_patterns JSONB,
  contributor_stats JSONB,
  branch_health JSONB,
  pr_insights JSONB,
  summary TEXT,
  detailed_report_path VARCHAR(500),
  action_items JSONB, -- Ações recomendadas
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Tabela para configurações de IA por workspace
CREATE TABLE IF NOT EXISTS workspace_ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE UNIQUE,
  ai_provider VARCHAR(50) DEFAULT 'openai', -- openai, anthropic, google, azure
  api_key_encrypted BYTEA,
  model_preference VARCHAR(100) DEFAULT 'gpt-4o',
  max_tokens INTEGER DEFAULT 4096,
  temperature DECIMAL(3,2) DEFAULT 0.7,
  enable_auto_task_generation BOOLEAN DEFAULT false,
  enable_code_analysis BOOLEAN DEFAULT true,
  enable_process_analysis BOOLEAN DEFAULT true,
  enable_contract_generation BOOLEAN DEFAULT true,
  custom_instructions TEXT, -- Instruções personalizadas para a IA
  usage_limit_monthly INTEGER, -- Limite de uso mensal (tokens ou requests)
  usage_current_month INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para log de uso de IA
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  feature_type VARCHAR(50) NOT NULL, -- task_generation, code_analysis, contract_gen, process_analysis
  ai_model_used VARCHAR(100),
  tokens_input INTEGER,
  tokens_output INTEGER,
  tokens_total INTEGER,
  cost_usd DECIMAL(10,6),
  duration_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_contracts_project_id ON contracts(project_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_generated_docs_project_id ON generated_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_process_analyses_project_id ON process_analyses(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_project_id ON ai_generated_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_github_analyses_repo_id ON github_ai_analyses(repository_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_workspace_id ON ai_usage_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON ai_usage_logs(created_at);

-- Trigger para updated_at em contract_templates
CREATE OR REPLACE FUNCTION update_contract_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_contract_templates
  BEFORE UPDATE ON contract_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_contract_templates_updated_at();

-- Trigger para updated_at em contracts
CREATE OR REPLACE FUNCTION update_contracts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_contracts
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_contracts_updated_at();

-- Trigger para updated_at em workspace_ai_settings
CREATE OR REPLACE FUNCTION update_workspace_ai_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_workspace_ai_settings
  BEFORE UPDATE ON workspace_ai_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_workspace_ai_settings_updated_at();

-- Comentários nas tabelas
COMMENT ON TABLE contract_templates IS 'Templates de contratos para geração automatizada';
COMMENT ON TABLE contracts IS 'Contratos gerados e gerenciados pela plataforma';
COMMENT ON TABLE contract_signatures IS 'Assinaturas digitais de contratos';
COMMENT ON TABLE generated_documents IS 'Documentos PDF gerados automaticamente (escopos, propostas, etc)';
COMMENT ON TABLE process_analyses IS 'Análises de processos de projeto usando IA';
COMMENT ON TABLE ai_generated_tasks IS 'Tarefas sugeridas/generated por IA aguardando aprovação';
COMMENT ON TABLE github_ai_analyses IS 'Análises de repositórios GitHub usando IA';
COMMENT ON TABLE workspace_ai_settings IS 'Configurações de IA por workspace';
COMMENT ON TABLE ai_usage_logs IS 'Log de uso e custos de IA';
