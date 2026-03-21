-- Project Templates tables
CREATE TABLE IF NOT EXISTS public.phase_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.phase_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.phase_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.phase_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase_template_items ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can do everything on phase_templates"
  ON public.phase_templates
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can do everything on phase_template_items"
  ON public.phase_template_items
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Regular users can view templates
CREATE POLICY "Users can view phase_templates"
  ON public.phase_templates
  FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Users can view phase_template_items"
  ON public.phase_template_items
  FOR SELECT
  TO authenticated
  USING (TRUE);

-- Trigger for updated_at
CREATE TRIGGER set_phase_templates_updated_at
  BEFORE UPDATE ON public.phase_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
