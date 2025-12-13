-- ==========================================
-- SITE IMAGES STORAGE BUCKET SETUP
-- ==========================================
-- 
-- INSTRUKCIE:
-- 1. Najprv vytvorte bucket cez Supabase Dashboard:
--    - Supabase Dashboard → Storage
--    - Kliknite na "New bucket"
--    - Názov bucketu: `site-images`
--    - Public bucket: **Zapnúť** (aby boli obrázky verejne dostupné)
--    - File size limit: 10MB
--    - Allowed MIME types: image/jpeg, image/jpg, image/png, image/gif, image/webp
--
-- 2. Potom spustite tento SQL skript na vytvorenie RLS policies
-- ==========================================

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Service role can upload site images" ON storage.objects;
DROP POLICY IF EXISTS "Service role can update site images" ON storage.objects;
DROP POLICY IF EXISTS "Service role can delete site images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload site images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update site images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete site images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view site images" ON storage.objects;

-- Allow service role to upload images (for scraping/processing)
CREATE POLICY "Service role can upload site images"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'site-images');

-- Allow service role to update images
CREATE POLICY "Service role can update site images"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'site-images');

-- Allow service role to delete images
CREATE POLICY "Service role can delete site images"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'site-images');

-- Allow authenticated users to upload images for sites they can edit
CREATE POLICY "Users can upload site images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'site-images' AND
  (
    -- For temp previews: allow if path starts with 'temp-preview/'
    name LIKE 'temp-preview/%'
    OR
    -- For sites: allow if user has access to the site
    EXISTS (
      SELECT 1 FROM public.sites s
      INNER JOIN public.memberships m ON m.workspace_id = s.workspace_id
      WHERE m.user_id = auth.uid()
      AND s.deleted_at IS NULL
      AND (
        -- Owners/admins can upload for any site in workspace
        (m.role IN ('owner', 'admin'))
        OR
        -- Agents can upload for sites they created or are assigned to
        (m.role = 'agent' AND (s.creator_id = auth.uid() OR s.assigned_agent_id = auth.uid()))
      )
      AND (name LIKE s.id::text || '/%' OR name = s.id::text || '.%')
    )
  )
);

-- Allow authenticated users to update images for sites they can edit
CREATE POLICY "Users can update site images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'site-images' AND
  (
    -- For temp previews: allow if path starts with 'temp-preview/'
    name LIKE 'temp-preview/%'
    OR
    -- For sites: allow if user has access to the site
    EXISTS (
      SELECT 1 FROM public.sites s
      INNER JOIN public.memberships m ON m.workspace_id = s.workspace_id
      WHERE m.user_id = auth.uid()
      AND s.deleted_at IS NULL
      AND (
        -- Owners/admins can update for any site in workspace
        (m.role IN ('owner', 'admin'))
        OR
        -- Agents can update for sites they created or are assigned to
        (m.role = 'agent' AND (s.creator_id = auth.uid() OR s.assigned_agent_id = auth.uid()))
      )
      AND (name LIKE s.id::text || '/%' OR name = s.id::text || '.%')
    )
  )
);

-- Allow authenticated users to delete images for sites they can edit
CREATE POLICY "Users can delete site images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'site-images' AND
  (
    -- For temp previews: allow if path starts with 'temp-preview/'
    name LIKE 'temp-preview/%'
    OR
    -- For sites: allow if user has access to the site
    EXISTS (
      SELECT 1 FROM public.sites s
      INNER JOIN public.memberships m ON m.workspace_id = s.workspace_id
      WHERE m.user_id = auth.uid()
      AND s.deleted_at IS NULL
      AND (
        -- Owners/admins can delete for any site in workspace
        (m.role IN ('owner', 'admin'))
        OR
        -- Agents can delete for sites they created or are assigned to
        (m.role = 'agent' AND (s.creator_id = auth.uid() OR s.assigned_agent_id = auth.uid()))
      )
      AND (name LIKE s.id::text || '/%' OR name = s.id::text || '.%')
    )
  )
);

-- Allow public read access to site images
CREATE POLICY "Public can view site images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'site-images');
