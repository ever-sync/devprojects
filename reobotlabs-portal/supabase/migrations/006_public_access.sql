-- Add public access columns to projects
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS public_token UUID UNIQUE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS public_enabled BOOLEAN DEFAULT FALSE;

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_projects_public_token ON public.projects(public_token);

-- Update RLS for public access
-- Since we want public access via token, we need a policy that allows selecting by token without authentication
CREATE POLICY "Public can view project by token"
  ON public.projects
  FOR SELECT
  TO anon, authenticated
  USING (public_enabled = TRUE AND public_token IS NOT NULL);

-- Allow public access to related data via project_id
CREATE POLICY "Public can view project phases by token"
  ON public.project_phases
  FOR SELECT
  TO anon, authenticated
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE public_enabled = TRUE AND public_token IS NOT NULL
    )
  );

CREATE POLICY "Public can view project tasks by token"
  ON public.tasks
  FOR SELECT
  TO anon, authenticated
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE public_enabled = TRUE AND public_token IS NOT NULL
    )
  );

CREATE POLICY "Public can view project activities by token"
  ON public.project_activities
  FOR SELECT
  TO anon, authenticated
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE public_enabled = TRUE AND public_token IS NOT NULL
    )
  );
