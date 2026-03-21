-- Fase 3: Colaboração Avançada e UX
-- Migration 039: Thread comments, keyboard shortcuts, offline sync

-- Tabela para comentários em thread (aninhados)
CREATE TABLE IF NOT EXISTS task_comment_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES task_comment_threads(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMPTZ,
    edited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_task_comment_threads_task ON task_comment_threads(task_id);
CREATE INDEX idx_task_comment_threads_parent ON task_comment_threads(parent_comment_id);
CREATE INDEX idx_task_comment_threads_document ON task_comment_threads(document_id);
CREATE INDEX idx_task_comment_threads_workspace ON task_comment_threads(workspace_id);

-- Tabela para menções em comentários
CREATE TABLE IF NOT EXISTS comment_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID REFERENCES task_comment_threads(id) ON DELETE CASCADE,
    mentioned_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    mentioned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comment_mentions_comment ON comment_mentions(comment_id);
CREATE INDEX idx_comment_mentions_user ON comment_mentions(mentioned_user_id);

-- Tabela para atalhos de teclado personalizados por usuário
CREATE TABLE IF NOT EXISTS user_keyboard_shortcuts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    shortcuts JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_keyboard_shortcuts_user ON user_keyboard_shortcuts(user_id);

-- Tabela para sincronização offline (operações pendentes)
CREATE TABLE IF NOT EXISTS offline_sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    operation_type TEXT NOT NULL CHECK (operation_type IN ('CREATE', 'UPDATE', 'DELETE')),
    entity_type TEXT NOT NULL,
    entity_id UUID,
    payload JSONB NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'syncing', 'completed', 'failed')),
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    synced_at TIMESTAMPTZ
);

CREATE INDEX idx_offline_sync_queue_user ON offline_sync_queue(user_id);
CREATE INDEX idx_offline_sync_queue_status ON offline_sync_queue(status);
CREATE INDEX idx_offline_sync_queue_entity ON offline_sync_queue(entity_type, entity_id);

-- Tabela para preferências de UI do usuário
CREATE TABLE IF NOT EXISTS user_ui_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    compact_mode BOOLEAN DEFAULT FALSE,
    font_size TEXT DEFAULT 'medium' CHECK (font_size IN ('small', 'medium', 'large')),
    sidebar_collapsed BOOLEAN DEFAULT FALSE,
    default_view TEXT DEFAULT 'kanban',
    timezone TEXT DEFAULT 'UTC',
    date_format TEXT DEFAULT 'DD/MM/YYYY',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_ui_preferences_user ON user_ui_preferences(user_id);

-- Tabela para atividade recente do usuário (para undo/redo)
CREATE TABLE IF NOT EXISTS user_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    previous_state JSONB,
    new_state JSONB,
    can_undo BOOLEAN DEFAULT TRUE,
    undone BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_activity_log_user ON user_activity_log(user_id);
CREATE INDEX idx_user_activity_log_workspace ON user_activity_log(workspace_id);
CREATE INDEX idx_user_activity_log_created ON user_activity_log(created_at DESC);

-- Adicionar colunas às tabelas existentes
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS last_comment_at TIMESTAMPTZ;

COMMENT ON TABLE task_comment_threads IS 'Comentários em thread com suporte a respostas aninhadas';
COMMENT ON TABLE comment_mentions IS 'Menções de usuários em comentários';
COMMENT ON TABLE user_keyboard_shortcuts IS 'Atalhos de teclado personalizados por usuário';
COMMENT ON TABLE offline_sync_queue IS 'Fila de operações para sincronização offline';
COMMENT ON TABLE user_ui_preferences IS 'Preferências de interface do usuário';
COMMENT ON TABLE user_activity_log IS 'Log de atividades para undo/redo';
