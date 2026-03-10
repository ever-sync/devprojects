-- ============================================================
-- 011_meetings.sql
-- Tabela de reuniões agendadas
-- ============================================================

CREATE TYPE public.meeting_location_type AS ENUM ('meet', 'local');

CREATE TABLE public.meetings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  description      TEXT,
  client_id        UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  project_id       UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  scheduled_date   DATE NOT NULL,
  scheduled_time   TIME NOT NULL,
  location_type    public.meeting_location_type NOT NULL DEFAULT 'meet',
  location_url     TEXT,   -- Google Meet link
  location_address TEXT,   -- Endereço físico
  invitees         JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- cada item: { id: string|null, name: string, email: string, type: 'team'|'client' }
  created_by       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX meetings_client_id_idx    ON public.meetings(client_id);
CREATE INDEX meetings_project_id_idx   ON public.meetings(project_id);
CREATE INDEX meetings_scheduled_date_idx ON public.meetings(scheduled_date);
CREATE INDEX meetings_created_by_idx   ON public.meetings(created_by);

-- Trigger updated_at
CREATE TRIGGER meetings_updated_at
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem criar / editar / deletar reuniões
CREATE POLICY "meetings_admin_all" ON public.meetings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Clientes podem ver reuniões do seu cliente
CREATE POLICY "meetings_client_read" ON public.meetings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.client_id = meetings.client_id
    )
  );
