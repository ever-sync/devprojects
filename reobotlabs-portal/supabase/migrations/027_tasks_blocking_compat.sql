-- Ensure task blocking columns exist in environments that missed migration 015.
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS blocked_reason TEXT,
ADD COLUMN IF NOT EXISTS blocked_since TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS remaining_hours NUMERIC;
