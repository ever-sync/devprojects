-- ============================================================
-- 004_storage_buckets.sql
-- Bucket de storage para arquivos de projetos
-- ============================================================

-- Criar bucket project-files (não público por padrão)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-files',
  'project-files',
  false,
  52428800, -- 50MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'text/plain',
    'text/csv'
  ]
);

-- Admins podem fazer tudo no bucket
CREATE POLICY "storage_admin_all" ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'project-files' AND public.is_admin()
  )
  WITH CHECK (
    bucket_id = 'project-files' AND public.is_admin()
  );

-- Clientes podem baixar arquivos da pasta do seu client_id
-- Estrutura de path: project-files/{client_id}/{project_id}/{filename}
CREATE POLICY "storage_client_select" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'project-files' AND
    (storage.foldername(name))[1] = public.get_user_client_id()::text
  );
