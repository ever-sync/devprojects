-- Fase 2.6: Tasks recorrentes

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS recurring_pattern TEXT,
  ADD COLUMN IF NOT EXISTS recurring_interval_days INTEGER,
  ADD COLUMN IF NOT EXISTS recurring_parent_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_recurring_pattern_check'
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_recurring_pattern_check
      CHECK (recurring_pattern IN ('daily', 'weekly', 'biweekly', 'monthly') OR recurring_pattern IS NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_recurring_interval_days_check'
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_recurring_interval_days_check
      CHECK (recurring_interval_days IS NULL OR recurring_interval_days >= 1);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_recurring_pattern ON public.tasks(recurring_pattern);
CREATE INDEX IF NOT EXISTS idx_tasks_recurring_parent ON public.tasks(recurring_parent_task_id);
