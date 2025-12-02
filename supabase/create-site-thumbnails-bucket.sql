-- ==========================================
-- SITE THUMBNAILS STORAGE BUCKET SETUP
-- ==========================================
-- 
-- INSTRUKCIE:
-- 1. Najprv vytvorte bucket cez Supabase Dashboard:
--    - Supabase Dashboard → Storage
--    - Kliknite na "New bucket"
--    - Názov bucketu: `site-thumbnails`
--    - Public bucket: **Zapnúť** (aby boli thumbnaily verejne dostupné)
--    - File size limit: 5MB
--    - Allowed MIME types: image/jpeg, image/jpg, image/png, image/gif, image/webp
--
-- 2. Potom spustite tento SQL skript na vytvorenie RLS policies
-- ==========================================

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Users can upload site thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Users can update site thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete site thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Public can view site thumbnails" ON storage.objects;

-- Allow users to upload thumbnails for sites they can edit
CREATE POLICY "Users can upload site thumbnails"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'site-thumbnails' AND
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
);

-- Allow users to update thumbnails for sites they can edit
CREATE POLICY "Users can update site thumbnails"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'site-thumbnails' AND
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
);

-- Allow users to delete thumbnails for sites they can edit
CREATE POLICY "Users can delete site thumbnails"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'site-thumbnails' AND
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
);

-- Allow public read access to site thumbnails
CREATE POLICY "Public can view site thumbnails"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'site-thumbnails');

