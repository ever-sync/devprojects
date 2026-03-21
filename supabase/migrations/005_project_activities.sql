-- Create activity actions enum
CREATE TYPE public.activity_action AS ENUM (
  'status_changed',
  'health_changed',
  'phase_updated',
  'created',
  'deleted'
);

-- Create project_activities table
CREATE TABLE IF NOT EXISTS public.project_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action public.activity_action NOT NULL,
  old_value TEXT,
  new_value TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can do everything on project_activities"
  ON public.project_activities
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Clients can view activities of their own projects"
  ON public.project_activities
  FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE client_id = get_user_client_id()
    )
  );

-- Function to handle project creation activity
CREATE OR REPLACE FUNCTION public.handle_project_created_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.project_activities (project_id, user_id, action, new_value)
  VALUES (NEW.id, NEW.created_by, 'created', NEW.name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for project creation
CREATE TRIGGER on_project_created
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_project_created_activity();
