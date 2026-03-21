-- Políticas RLS para Fase 3: Colaboração e UX

-- task_comment_threads policies
ALTER TABLE task_comment_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comment threads in their workspace"
ON task_comment_threads FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = task_comment_threads.workspace_id
        AND wm.user_id = auth.uid()
    )
);

CREATE POLICY "Users can create comments in their workspace"
ON task_comment_threads FOR INSERT
WITH CHECK (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their own comments"
ON task_comment_threads FOR UPDATE
USING (author_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
ON task_comment_threads FOR DELETE
USING (author_id = auth.uid());

-- comment_mentions policies
ALTER TABLE comment_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own mentions"
ON comment_mentions FOR SELECT
USING (mentioned_user_id = auth.uid());

CREATE POLICY "Users can create mentions"
ON comment_mentions FOR INSERT
WITH CHECK (
    mentioned_by = auth.uid() OR
    EXISTS (
        SELECT 1 FROM task_comment_threads tct
        JOIN workspace_members wm ON wm.workspace_id = tct.workspace_id
        WHERE tct.id = comment_mentions.comment_id
        AND wm.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their own mention read status"
ON comment_mentions FOR UPDATE
USING (mentioned_user_id = auth.uid());

-- user_keyboard_shortcuts policies
ALTER TABLE user_keyboard_shortcuts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own shortcuts"
ON user_keyboard_shortcuts FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own shortcuts"
ON user_keyboard_shortcuts FOR ALL
USING (user_id = auth.uid());

-- offline_sync_queue policies
ALTER TABLE offline_sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sync queue"
ON offline_sync_queue FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own sync queue"
ON offline_sync_queue FOR ALL
USING (user_id = auth.uid());

-- user_ui_preferences policies
ALTER TABLE user_ui_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences"
ON user_ui_preferences FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own preferences"
ON user_ui_preferences FOR ALL
USING (user_id = auth.uid());

-- user_activity_log policies
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activity log"
ON user_activity_log FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create activity logs"
ON user_activity_log FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own activity logs"
ON user_activity_log FOR UPDATE
USING (user_id = auth.uid());

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON task_comment_threads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON comment_mentions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_keyboard_shortcuts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON offline_sync_queue TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_ui_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_activity_log TO authenticated;
