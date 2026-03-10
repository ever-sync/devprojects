-- ============================================================
-- 010_storage_avatars.sql
-- Bucket and policies for user avatars
-- ============================================================

-- Public bucket for avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
);

-- Public read for avatars
CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'avatars'
  );

-- Users can manage only their own avatar folder: avatars/{user_id}/avatar.ext
CREATE POLICY "avatars_user_write" ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
