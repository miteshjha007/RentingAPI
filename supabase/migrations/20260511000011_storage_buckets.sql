-- Migration 011: Storage buckets
-- Supabase Storage buckets are created via the Management API or dashboard,
-- but bucket policies can be seeded here using the storage schema helpers.

-- Insert bucket definitions
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'property-images',
    'property-images',
    TRUE,
    5242880,  -- 5 MB
    ARRAY['image/jpeg','image/png','image/webp','image/heic']
  ),
  (
    'property-videos',
    'property-videos',
    TRUE,
    52428800, -- 50 MB
    ARRAY['video/mp4','video/quicktime','video/webm']
  ),
  (
    'avatars',
    'avatars',
    TRUE,
    2097152,  -- 2 MB
    ARRAY['image/jpeg','image/png','image/webp']
  ),
  (
    'food-menus',
    'food-menus',
    TRUE,
    5242880,  -- 5 MB
    ARRAY['image/jpeg','image/png','image/webp','application/pdf']
  )
ON CONFLICT (id) DO NOTHING;

-- ── Storage RLS Policies ──────────────────────────────────────────────────────

-- property-images: public read
CREATE POLICY "property-images: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'property-images');

-- property-images: authenticated owners upload (path = owner_id/*)
CREATE POLICY "property-images: owner upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'property-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- property-images: owners can delete their own files
CREATE POLICY "property-images: owner delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'property-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- property-videos: public read
CREATE POLICY "property-videos: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'property-videos');

CREATE POLICY "property-videos: owner upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'property-videos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "property-videos: owner delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'property-videos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- avatars: public read
CREATE POLICY "avatars: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- avatars: user uploads only into their own folder (path = user_id/*)
CREATE POLICY "avatars: user upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars: user delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- food-menus: public read
CREATE POLICY "food-menus: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'food-menus');

CREATE POLICY "food-menus: owner upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'food-menus'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "food-menus: owner delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'food-menus'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
