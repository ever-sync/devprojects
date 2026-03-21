-- Add time tracking columns to tasks
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_hours NUMERIC DEFAULT 0;

-- Ensure actual_hours and estimated_hours are not negative
ALTER TABLE public.tasks
ADD CONSTRAINT check_estimated_hours_positive CHECK (estimated_hours >= 0),
ADD CONSTRAINT check_actual_hours_positive CHECK (actual_hours >= 0);
