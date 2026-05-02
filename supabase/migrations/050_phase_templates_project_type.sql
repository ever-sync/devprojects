-- Fase 2.7: templates por tipo de projeto

ALTER TABLE public.phase_templates
  ADD COLUMN IF NOT EXISTS project_type TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'phase_templates_project_type_check'
  ) THEN
    ALTER TABLE public.phase_templates
      ADD CONSTRAINT phase_templates_project_type_check
      CHECK (project_type IN ('saas', 'automation', 'ai_agent') OR project_type IS NULL);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_phase_templates_project_type
  ON public.phase_templates(project_type);
