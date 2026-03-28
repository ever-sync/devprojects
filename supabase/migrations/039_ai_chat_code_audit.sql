-- Migration: AI Chat (RAG) e Code Audit
-- Fase 1 do Plano Mestre de Evolução

-- ============================================
-- 1. TABELAS PARA CHAT COM IA (RAG)
-- ============================================

-- Tabela de documentos vetoriais para busca semântica
CREATE TABLE IF NOT EXISTS vector_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    title TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('document', 'meeting', 'comment', 'task', 'proposal')),
    source_id UUID NOT NULL,
    embedding vector(1536),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para busca vetorial (requer extensão pgvector)
CREATE INDEX IF NOT EXISTS idx_vector_documents_embedding 
ON vector_documents USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Índice para filtros por projeto
CREATE INDEX IF NOT EXISTS idx_vector_documents_project 
ON vector_documents(project_id, source_type);

-- Tabela de conversas do chat
CREATE TABLE IF NOT EXISTS ai_chat_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_conversations_project 
ON ai_chat_conversations(project_id, created_at DESC);

-- Tabela de mensagens do chat
CREATE TABLE IF NOT EXISTS ai_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES ai_chat_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    sources JSONB DEFAULT '[]',
    token_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_conversation 
ON ai_chat_messages(conversation_id, created_at ASC);

-- ============================================
-- 2. TABELAS PARA CODE AUDIT
-- ============================================

-- Tabela de auditorias de código
CREATE TABLE IF NOT EXISTS code_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Origem da análise
    pull_request_id TEXT,
    commit_sha TEXT,
    repository_url TEXT,
    language TEXT NOT NULL DEFAULT 'typescript',
    
    -- Scores
    overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    criteria_scores JSONB NOT NULL DEFAULT '{}',
    
    -- Issues e sugestões
    critical_issues JSONB DEFAULT '[]',
    refactoring_suggestions TEXT[] DEFAULT '{}',
    positive_highlights TEXT[] DEFAULT '{}',
    
    -- Metadados
    technical_debt_level TEXT CHECK (technical_debt_level IN ('low', 'medium', 'high')),
    summary TEXT,
    raw_analysis JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_code_audits_project 
ON code_audits(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_code_audits_pr 
ON code_audits(pull_request_id) WHERE pull_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_code_audits_commit 
ON code_audits(commit_sha) WHERE commit_sha IS NOT NULL;

-- ============================================
-- 3. FUNÇÃO DE BUSCA VETORIAL (RAG)
-- ============================================

-- Função para buscar documentos similares
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding vector(1536),
    match_count INTEGER DEFAULT 5,
    filter JSONB DEFAULT '{}'
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    title TEXT,
    source_type TEXT,
    source_id UUID,
    similarity FLOAT,
    metadata JSONB
)
LANGUAGE plpgsql
AS $$
#variable_conflict use_column
BEGIN
    RETURN QUERY
    SELECT
        v.id,
        v.content,
        v.title,
        v.source_type,
        v.source_id,
        1 - (v.embedding <=> query_embedding) AS similarity,
        v.metadata
    FROM vector_documents v
    WHERE v.project_id = (filter->>'project_id')::UUID
      AND (filter->>'source_type') IS NULL OR v.source_type = (filter->>'source_type')
    ORDER BY v.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ============================================
-- 4. TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA
-- ============================================

-- Trigger para atualizar updated_at em conversas
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ai_chat_conversations_updated_at
    BEFORE UPDATE ON ai_chat_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_vector_documents_updated_at
    BEFORE UPDATE ON vector_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. POLÍTICAS RLS (Row Level Security)
-- ============================================

-- Habilitar RLS nas tabelas
ALTER TABLE vector_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_audits ENABLE ROW LEVEL SECURITY;

-- Políticas para vector_documents
CREATE POLICY "Usuários podem ver documentos de seus projetos"
ON vector_documents FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = vector_documents.project_id
        AND pm.user_id = auth.uid()
    )
);

CREATE POLICY "Serviço pode inserir documentos"
ON vector_documents FOR INSERT
WITH CHECK (true); -- Controlado via backend

-- Políticas para ai_chat_conversations
CREATE POLICY "Usuários podem ver conversas de seus projetos"
ON ai_chat_conversations FOR SELECT
USING (
    project_id IN (
        SELECT project_id FROM project_members
        WHERE user_id = auth.uid()
    )
    OR user_id = auth.uid()
);

CREATE POLICY "Usuários podem criar conversas"
ON ai_chat_conversations FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Políticas para ai_chat_messages
CREATE POLICY "Usuários podem ver mensagens de suas conversas"
ON ai_chat_messages FOR SELECT
USING (
    conversation_id IN (
        SELECT id FROM ai_chat_conversations
        WHERE user_id = auth.uid()
        OR project_id IN (
            SELECT project_id FROM project_members
            WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY "Usuários podem enviar mensagens"
ON ai_chat_messages FOR INSERT
WITH CHECK (true); -- Controlado via backend

-- Políticas para code_audits
CREATE POLICY "Usuários podem ver auditorias de seus projetos"
ON code_audits FOR SELECT
USING (
    project_id IN (
        SELECT project_id FROM project_members
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Usuários podem criar auditorias"
ON code_audits FOR INSERT
WITH CHECK (user_id = auth.uid());

-- ============================================
-- 6. EXTENSÃO PGVECTOR (se necessário)
-- ============================================

-- Nota: A extensão pgvector deve ser habilitada no Supabase
-- Via dashboard ou comando: CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- COMENTÁRIOS NAS TABELAS
-- ============================================

COMMENT ON TABLE vector_documents IS 'Documentos indexados para busca semântica (RAG)';
COMMENT ON TABLE ai_chat_conversations IS 'Conversas do chat com IA';
COMMENT ON TABLE ai_chat_messages IS 'Mensagens das conversas com IA, incluindo fontes';
COMMENT ON TABLE code_audits IS 'Auditorias de código realizadas pela IA';

COMMENT ON FUNCTION match_documents IS 'Busca documentos similares usando similaridade de cosseno';
