ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS detail_notes TEXT,
ADD COLUMN IF NOT EXISTS checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS mentioned_user_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
ADD COLUMN IF NOT EXISTS image_path TEXT,
ADD COLUMN IF NOT EXISTS task_category TEXT NOT NULL DEFAULT 'other';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_task_category_check'
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_task_category_check
      CHECK (task_category IN ('saas', 'automation', 'other'));
  END IF;
END;
$$;
