-- Fase 2.1: Timer start/stop por task
-- Permite entradas em andamento em time_entries sem horas finais ate o stop.

ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_running BOOLEAN NOT NULL DEFAULT false;

-- Para suportar registros "abertos" durante execucao do timer.
ALTER TABLE public.time_entries
  ALTER COLUMN hours DROP NOT NULL;

ALTER TABLE public.time_entries
  DROP CONSTRAINT IF EXISTS time_entries_hours_check;

ALTER TABLE public.time_entries
  ADD CONSTRAINT time_entries_hours_check
  CHECK (
    (is_running = true AND hours IS NULL)
    OR
    (is_running = false AND hours IS NOT NULL AND hours > 0)
  );

-- Garante apenas um timer ativo por usuario.
CREATE UNIQUE INDEX IF NOT EXISTS idx_time_entries_one_active_timer_per_user
  ON public.time_entries (user_id)
  WHERE is_running = true;

CREATE INDEX IF NOT EXISTS idx_time_entries_running_user_task
  ON public.time_entries (user_id, task_id)
  WHERE is_running = true;
